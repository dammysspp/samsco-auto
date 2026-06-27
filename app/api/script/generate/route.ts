import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateAIFootballContent } from "@/lib/groq";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing draft ID" }, { status: 400 });
    }

    const contentItem = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!contentItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const apiKey = settings?.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key not found. Please configure it in Settings." },
        { status: 400 }
      );
    }

    console.log(`[AI Script Gen] Triggering script generation for: "${contentItem.title}"`);
    
    // Lock the record
    await prisma.contentQueue.update({
      where: { id },
      data: { status: "script_generating" }
    });

    const generated = await generateAIFootballContent(
      contentItem.title,
      contentItem.description || "",
      apiKey
    );

    const initialVersion = {
      timestamp: new Date().toISOString(),
      script: generated.shortsScript || "",
      caption: generated.communityCaption || "",
      type: "initial_generation",
    };

    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: {
        shortsScript: generated.shortsScript,
        communityCaption: generated.communityCaption,
        status: "review_script",
        scriptGeneratedAt: new Date(),
        scriptVersions: JSON.stringify([initialVersion]),
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "AI scripts generated successfully.",
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Script Generation Error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
