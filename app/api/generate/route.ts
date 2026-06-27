import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateAIFootballContent } from "@/lib/groq";
import { generateFreeSpeech } from "@/lib/tts";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. Verify User Session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // 2. Parse request parameters
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing draft ID" }, { status: 400 });
    }

    // 3. Find the queue item
    const contentItem = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!contentItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    // 4. Retrieve settings for custom Groq API keys and preferred posting time
    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const apiKey = settings?.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key not found. Please set it in Settings." },
        { status: 400 }
      );
    }

    // 5. Run Groq Llama 3 generation
    console.log(`[AI Generation] Triggered for title: "${contentItem.title}"`);
    const generated = await generateAIFootballContent(
      contentItem.title,
      contentItem.description || "",
      apiKey
    );

    // Generate Free Speech Voiceover Audio (MP3)
    let ttsError = null;
    try {
      if (generated.shortsScript) {
        await generateFreeSpeech(generated.shortsScript, id);
      }
    } catch (err: any) {
      console.error("[Generate Route] TTS voiceover generation failed: ", err);
      ttsError = `TTS Warning: ${err.message || String(err)}`;
    }

    // 6. Calculate the next scheduled post timestamp based on settings
    const preferredTimeStr = settings?.preferredTime || "12:00";
    const [hours, minutes] = preferredTimeStr.split(":").map(Number);
    
    let scheduledDate = new Date();
    scheduledDate.setUTCHours(hours, minutes, 0, 0);

    // If the preferred time has already passed today, set to tomorrow
    if (scheduledDate.getTime() <= Date.now()) {
      scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
    }

    // Adjust date based on frequency (Daily, Weekly, Monthly)
    const frequency = settings?.postingFrequency || "DAILY";
    if (frequency === "WEEKLY") {
      // Find the next scheduled item for this user to check spacing, or just offset by a week
      scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 6);
    } else if (frequency === "MONTHLY") {
      scheduledDate.setUTCMonth(scheduledDate.getUTCMonth() + 1);
    }

    // 7. Update database record with generated content and scheduled status
    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: {
        shortsScript: generated.shortsScript,
        communityCaption: generated.communityCaption,
        status: "scheduled",
        scheduledFor: scheduledDate,
        errorMessage: ttsError,
      },
    });

    return NextResponse.json({
      success: true,
      message: "AI scripts generated and scheduled successfully.",
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("AI Generation Route Error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
