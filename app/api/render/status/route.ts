import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkShotstackStatus } from "@/lib/video";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing queue item ID" }, { status: 400 });
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json({ error: "Post item not found" }, { status: 404 });
    }

    if (!item.shotstackRenderId) {
      return NextResponse.json({
        success: true,
        status: "none",
        data: item,
      });
    }

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const apiKey = settings?.shotstackApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: "Shotstack API Key is not configured." }, { status: 400 });
    }

    console.log(`[Render Status] Polling Shotstack for Render ID: ${item.shotstackRenderId}`);
    const render = await checkShotstackStatus(item.shotstackRenderId, apiKey);

    let updatedItem = item;

    if (render.status === "done" && render.url) {
      console.log(`[Render Status] Render complete! S3 URL: ${render.url}`);
      updatedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          videoUrl: render.url,
          status: "review_video",
          renderCompletedAt: new Date(),
          errorMessage: null,
        },
      });
    } else if (render.status === "failed") {
      console.warn(`[Render Status] Render failed: ${render.error}`);
      updatedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "render_failed",
          errorMessage: `Shotstack Rendering Error: ${render.error || "Unknown render error"}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: render.status,
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Render Status Route Error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
