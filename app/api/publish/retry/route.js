import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadYouTubeShort } from "@/lib/youtube";
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

    if (!item.videoUrl) {
      return NextResponse.json(
        { error: "No video compiled to publish." },
        { status: 400 },
      );
    }

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.youtubeOAuth) {
      return NextResponse.json(
        { error: "YouTube credentials not configured." },
        { status: 400 },
      );
    }

    // Lock to publishing and increment retryCount
    await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "publishing",
        retryCount: { increment: 1 },
      },
    });

    const credentials = JSON.parse(settings.youtubeOAuth);

    try {
      const uploadResult = await uploadYouTubeShort(
        credentials,
        item.title,
        item.shortsScript || "",
        item.videoUrl,
        {
          youtubeClientId: settings.youtubeClientId,
          youtubeClientSecret: settings.youtubeClientSecret,
          youtubeRedirectUri: settings.youtubeRedirectUri,
        },
      );

      const postedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "posted",
          youtubeVideoId: uploadResult.videoId,
          youtubeUrl: uploadResult.url,
          postedAt: new Date(),
          errorMessage: null,
        },
      });

      return NextResponse.json({
        success: true,
        status: "posted",
        data: postedItem,
      });
    } catch (uploadErr) {
      const failedItem = await prisma.contentQueue.update({
        where: { id },
        data: {
          status: "publish_failed",
          errorMessage: `YouTube publish failed: ${uploadErr.message || String(uploadErr)}`,
        },
      });
      return NextResponse.json({
        success: false,
        status: "publish_failed",
        data: failedItem,
      });
    }
  } catch (error) {
    console.error("Publish Retry Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
