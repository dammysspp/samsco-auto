import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFreeSpeech } from "@/lib/tts";
import { compileSlideshowVideo } from "@/lib/video";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item || !item.shortsScript) {
      return NextResponse.json({ error: "Draft item or script not found." }, { status: 404 });
    }

    console.log(`[Unified Video Compile] Starting compilation chain for: "${item.title}"`);

    // 1. Lock to generating stage
    await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "audio_generating",
        scriptApprovedAt: new Date(),
      },
    });

    // 2. Step A: Generate TTS Audio Narration locally in /tmp
    try {
      await generateFreeSpeech(item.shortsScript, id);
    } catch (ttsErr) {
      console.error("[Unified Compiler] TTS voiceover generation failed:", ttsErr);
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "audio_failed",
          errorMessage: `TTS generation failed: ${ttsErr.message || String(ttsErr)}`,
        },
      });
      return NextResponse.json({
        success: false,
        status: "audio_failed",
        data: failedItem,
      });
    }

    // 3. Step B: Trigger Shotstack cloud rendering (including Apify Google Images & Subtitles)
    let shotstackRenderId = "";
    let publicAudioUrl = "";
    try {
      const compileResult = await compileSlideshowVideo(id, item.title, userId);
      
      if (compileResult.success) {
        shotstackRenderId = compileResult.renderId;
        publicAudioUrl = compileResult.audioUrl;
      } else {
        throw new Error(compileResult.message);
      }
    } catch (compileErr) {
      console.error("[Unified Compiler] Shotstack cloud compile failed:", compileErr);
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "render_failed",
          errorMessage: `Shotstack trigger failed: ${compileErr.message || String(compileErr)}`,
        },
      });
      return NextResponse.json({
        success: false,
        status: "render_failed",
        data: failedItem,
      });
    }

    // 4. Update status to rendering_video
    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "rendering_video",
        audioUrl: publicAudioUrl,
        shotstackRenderId,
        audioGeneratedAt: new Date(),
        renderSubmittedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      status: "rendering_video",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Unified Compiler API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
