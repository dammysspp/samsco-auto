import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkShotstackStatus } from "@/lib/video";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
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
        message: "No active Shotstack render job exists for this post.",
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

    console.log(`[Status Check] Querying Shotstack for ID: ${item.shotstackRenderId}`);
    const render = await checkShotstackStatus(item.shotstackRenderId, apiKey);

    let updatedItem = item;

    if (render.status === "done" && render.url) {
      console.log(`[Status Check] Render finished! S3 URL: ${render.url}`);
      updatedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          videoUrl: render.url,
          errorMessage: null,
        },
      });
    } else if (render.status === "failed") {
      console.warn(`[Status Check] Render failed: ${render.error}`);
      updatedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          errorMessage: `Shotstack Rendering Error: ${render.error || "Unknown render crash"}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: render.status,
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Check video status error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
