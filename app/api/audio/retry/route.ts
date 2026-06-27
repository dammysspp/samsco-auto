import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateFreeSpeech } from "@/lib/tts";
import { compileSlideshowVideo } from "@/lib/video";
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
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item || !item.shortsScript) {
      return NextResponse.json({ error: "Script not found." }, { status: 404 });
    }

    // Lock to audio_generating and increment retryCount
    await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "audio_generating",
        retryCount: { increment: 1 },
      },
    });

    // Generate Google TTS Voiceover
    try {
      await generateFreeSpeech(item.shortsScript, id);
    } catch (ttsErr: any) {
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "audio_failed",
          errorMessage: `TTS generation failed: ${ttsErr.message || String(ttsErr)}`,
        },
      });
      return NextResponse.json({ success: false, status: "audio_failed", data: failedItem });
    }

    // Trigger Shotstack compilation
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
    } catch (compileErr: any) {
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "render_failed",
          errorMessage: `Shotstack trigger failed: ${compileErr.message || String(compileErr)}`,
        },
      });
      return NextResponse.json({ success: false, status: "render_failed", data: failedItem });
    }

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
  } catch (error: any) {
    console.error("Audio Retry Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
