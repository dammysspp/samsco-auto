import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compileSlideshowVideo } from "@/lib/video";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Queue item not found." },
        { status: 404 },
      );
    }

    // Lock to rendering_video and increment retryCount
    await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "rendering_video",
        retryCount: { increment: 1 },
      },
    });

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
    } catch (compileErr) {
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

    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "rendering_video",
        audioUrl: publicAudioUrl,
        shotstackRenderId,
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
    console.error("Render Retry Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
