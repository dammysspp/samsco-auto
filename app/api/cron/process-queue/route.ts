import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadYouTubeShort, postCommunityTab } from "@/lib/youtube";

export async function GET(req: Request) {
  return handleCronProcess(req);
}

export async function POST(req: Request) {
  return handleCronProcess(req);
}

async function handleCronProcess(req: Request) {
  try {
    // 1. Resolve Cron Secret from database (falling back to process.env)
    const firstSettings = await prisma.scheduleSettings.findFirst({
      select: { cronSecret: true },
    });
    
    const expectedSecret = firstSettings?.cronSecret || process.env.CRON_SECRET;

    const authHeader = req.headers.get("authorization");
    const searchParams = new URL(req.url).searchParams;
    const urlSecret = searchParams.get("secret");

    if (
      expectedSecret &&
      authHeader !== `Bearer ${expectedSecret}` &&
      urlSecret !== expectedSecret
    ) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const now = new Date();

    // 2. Query all scheduled content items that are ready to be posted
    const queueItems = await prisma.contentQueue.findMany({
      where: {
        status: "scheduled",
        scheduledFor: {
          lte: now,
        },
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
        message: "No scheduled posts currently pending publication.",
        processedCount: 0,
      });
    }

    const report = [];

    // 3. Process each pending publication
    for (const item of queueItems) {
      const settings = item.user.scheduleSettings;
      
      if (!settings || !settings.youtubeOAuth) {
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "publish_failed",
            errorMessage: "No YouTube OAuth credentials configured in settings.",
          },
        });
        report.push({ id: item.id, status: "failed", error: "Missing OAuth credentials" });
        continue;
      }

      let credentials;
      try {
        credentials = JSON.parse(settings.youtubeOAuth);
      } catch (e) {
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "publish_failed",
            errorMessage: "YouTube OAuth credentials in database are corrupted/invalid JSON.",
          },
        });
        report.push({ id: item.id, status: "failed", error: "Corrupted credentials JSON" });
        continue;
      }

      // Collect database-stored YouTube client keys
      const ytSettings = {
        youtubeClientId: settings.youtubeClientId || undefined,
        youtubeClientSecret: settings.youtubeClientSecret || undefined,
        youtubeRedirectUri: settings.youtubeRedirectUri || undefined,
      };

      try {
        console.log(`[Cron Scheduler] Starting publication for: "${item.title}"`);

        // Lock to publishing
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "publishing",
            publishingStartedAt: new Date(),
          },
        });

        if (!item.videoUrl) {
          throw new Error("No compiled S3 videoUrl found for this scheduled post.");
        }

        // A. Upload YouTube Short (passing S3 videoUrl to stream)
        const uploadResult = await uploadYouTubeShort(
          credentials,
          item.title,
          item.shortsScript || "World Cup 2026 update!",
          item.videoUrl,
          ytSettings
        );

        // B. Post Community Tab Caption (passing custom settings from DB)
        let communityMessage = "Post skipped - caption empty";
        if (item.communityCaption) {
          try {
            const communityResult = await postCommunityTab(
              credentials,
              item.communityCaption,
              {
                clientId: ytSettings.youtubeClientId,
                clientSecret: ytSettings.youtubeClientSecret,
                redirectUri: ytSettings.youtubeRedirectUri,
              }
            );
            communityMessage = communityResult.message;
          } catch (cErr: any) {
            console.warn("[Cron Scheduler] Community post failed but video succeeded:", cErr);
            communityMessage = `Community post warning: ${cErr.message || String(cErr)}`;
          }
        }

        // C. Update database item as posted successfully
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "posted",
            youtubeVideoId: uploadResult.videoId,
            youtubeUrl: uploadResult.url,
            postedAt: now,
            errorMessage: communityMessage.startsWith("Community post warning") ? communityMessage : null,
          },
        });

        report.push({ id: item.id, status: "posted", videoUrl: uploadResult.url });
      } catch (uploadError: any) {
        console.error(`[Cron Scheduler] Failed to post item ${item.id}: `, uploadError);
        
        await prisma.contentQueue.update({
          where: { id: item.id },
          data: {
            status: "publish_failed",
            errorMessage: uploadError.message || String(uploadError),
            retryCount: { increment: 1 },
          },
        });

        report.push({ id: item.id, status: "failed", error: uploadError.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${queueItems.length} publications.`,
      report,
    });
  } catch (error: any) {
    console.error("Cron route general exception: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
