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
      return NextResponse.json({ error: "Content item or script not found." }, { status: 404 });
    }

    // 1. Lock record to audio_generating
    console.log(`[Script Approve] Initializing audio generation for: "${item.title}"`);
    await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "audio_generating",
        scriptApprovedAt: new Date(),
      },
    });

    // 2. Generate Google TTS Voiceover locally
    let audioUrl = "";
    try {
      await generateFreeSpeech(item.shortsScript, id);
    } catch (ttsErr: any) {
      console.error("[Script Approve] TTS generation failed:", ttsErr);
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "audio_failed",
          errorMessage: `TTS generation failed: ${ttsErr.message || String(ttsErr)}`,
        },
      });
      return NextResponse.json({ success: false, status: "audio_failed", data: failedItem });
    }

    // 3. Upload TTS to tmpfiles.org and trigger Shotstack video compilation
    let shotstackRenderId = "";
    let publicAudioUrl = "";
    try {
      console.log(`[Script Approve] Triggering Shotstack cloud slideshow render...`);
      const compileResult = await compileSlideshowVideo(id, item.title, userId);
      
      if (compileResult.success) {
        shotstackRenderId = compileResult.renderId;
        publicAudioUrl = compileResult.audioUrl;
      } else {
        throw new Error(compileResult.message);
      }
    } catch (compileErr: any) {
      console.error("[Script Approve] Shotstack render trigger failed:", compileErr);
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "render_failed",
          errorMessage: `Shotstack trigger failed: ${compileErr.message || String(compileErr)}`,
        },
      });
      return NextResponse.json({ success: false, status: "render_failed", data: failedItem });
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
  } catch (error: any) {
    console.error("Approve Script Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
