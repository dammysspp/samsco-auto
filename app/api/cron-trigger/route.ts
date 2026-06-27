import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadYouTubeShort, postCommunityTab } from "@/lib/youtube";

export async function POST() {
  try {
    // 1. Verify authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // 2. Fetch all scheduled items for the active user
    const queueItems = await prisma.contentQueue.findMany({
      where: {
        userId,
        status: "scheduled",
      },
      include: {
        user: {
          include: {
            scheduleSettings: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    });

    if (queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled posts found in your queue to process.",
        processedCount: 0,
      });
    }

    const report = [];
    const now = new Date();

    // 3. Process items manually
    for (const item of queueItems) {
      const settings = item.user.scheduleSettings;
      if (!settings || !settings.youtubeOAuth) {
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: "Missing YouTube Credentials in settings.",
          },
        });
        report.push({ title: item.title, status: "failed", error: "No OAuth configured" });
        continue;
      }

      const credentials = JSON.parse(settings.youtubeOAuth);

      // Collect database-stored YouTube client keys
      const ytSettings = {
        clientId: settings.youtubeClientId,
        clientSecret: settings.youtubeClientSecret,
        redirectUri: settings.youtubeRedirectUri,
      };

      try {
        // Upload Shorts (passing custom settings from DB)
        const uploadResult = await uploadYouTubeShort(
          credentials,
          item.title,
          item.shortsScript || "FIFA 2026 update!",
          undefined,
          ytSettings
        );

        // Upload Community Tab (passing custom settings from DB)
        let communityMessage = "Skipped";
        if (item.communityCaption) {
          const communityResult = await postCommunityTab(
            credentials,
            item.communityCaption,
            ytSettings
          );
          communityMessage = communityResult.message;
        }

        // Update Record
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "posted",
            postedAt: now,
            errorMessage: `Manually Published. Video: ${uploadResult.url}. Community: ${communityMessage}`,
          },
        });

        report.push({ title: item.title, status: "posted", url: uploadResult.url });
      } catch (err: any) {
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: err.message || String(err),
          },
        });
        report.push({ title: item.title, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${queueItems.length} publications.`,
      report,
    });
  } catch (error: any) {
    console.error("Manual process queue error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
