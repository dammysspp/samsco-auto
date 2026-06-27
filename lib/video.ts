import { exec } from "child_process";
import fs from "fs";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import prisma from "@/lib/prisma";

const ffmpegPath = ffmpegInstaller.path;

export interface VideoCompilerResult {
  success: boolean;
  videoUrl: string;
  message: string;
}

/**
 * Gets the exact duration of an audio file in seconds by running a quick info inspect in FFmpeg.
 */
function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve) => {
    const cmd = `"${ffmpegPath}" -i "${audioPath}" 2>&1`;
    exec(cmd, (err, stdout, stderr) => {
      const output = stderr || stdout;
      const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const centiseconds = parseInt(match[4]);
        const total = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        resolve(total);
      } else {
        console.warn("[Video Compiler] Could not parse exact audio duration, falling back to 20s.");
        resolve(20); // Safe fallback
      }
    });
  });
}

/**
 * Downloads a binary file from a URL to a local destination.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(destPath, buffer);
}

/**
 * Compiles a slideshow video using Apify Google Images Scraper and FFmpeg.
 * 
 * @param queueItemId The ID of the queue item (e.g. for audio path lookup)
 * @param searchQuery The search query for Google Images (e.g. "Messi World Cup 2026")
 * @param userId The ID of the user triggering the compilation (for API key retrieval)
 */
export async function compileSlideshowVideo(
  queueItemId: string,
  searchQuery: string,
  userId: string
): Promise<VideoCompilerResult> {
  const tempDir = path.join(process.cwd(), "public", `temp-${queueItemId}`);
  const outputDir = path.join(process.cwd(), "public", "videos");
  const audioPath = path.join(process.cwd(), "public", "audio", `${queueItemId}.mp3`);
  const backgroundMusicPath = path.join(process.cwd(), "public", "music", "background.mp3");
  const outputVideoPath = path.join(outputDir, `${queueItemId}.mp4`);

  try {
    // 1. Check if output directories exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error(`TTS audio file not found at: ${audioPath}`);
    }

    // 2. Fetch Apify credentials
    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const apifyApiKey = settings?.apifyApiKey;
    if (!apifyApiKey) {
      throw new Error("Apify API key is not configured in database settings.");
    }

    console.log(`[Video Compiler] Starting Apify search for: "${searchQuery}"`);

    // 3. Trigger Apify Google Images Scraper
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~google-images-scraper/run-sync-get-dataset-items?token=${apifyApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: searchQuery,
          maxResults: 6,
          imagesLanguage: "en",
        }),
      }
    );

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      throw new Error(`Apify API failed with status ${apifyResponse.status}: ${errorText}`);
    }

    const scrapedItems = await apifyResponse.json();
    if (!Array.isArray(scrapedItems) || scrapedItems.length === 0) {
      throw new Error("Apify Scraper returned no image results for the query.");
    }

    // Parse image URLs
    const imageUrls = scrapedItems
      .map((item: any) => item.imageUrl || item.image)
      .filter((url: any) => typeof url === "string" && url.startsWith("http"));

    if (imageUrls.length === 0) {
      throw new Error("No valid image URLs found in the Apify search dataset.");
    }

    // 4. Download images locally
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const downloadedImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imgUrl = imageUrls[i];
      const imgPath = path.join(tempDir, `slide-${i}.jpg`);
      try {
        await downloadFile(imgUrl, imgPath);
        downloadedImages.push(imgPath);
        console.log(`[Video Compiler] Downloaded: slide-${i}.jpg`);
      } catch (err: any) {
        console.warn(`[Video Compiler] Failed to download image ${i} (${imgUrl}):`, err.message);
      }
    }

    if (downloadedImages.length === 0) {
      throw new Error("Failed to download any images for the video compiler.");
    }

    // 5. Inspect TTS audio duration
    const audioDuration = await getAudioDuration(audioPath);
    console.log(`[Video Compiler] Audio duration: ${audioDuration}s`);

    const slideDuration = audioDuration / downloadedImages.length;
    console.log(`[Video Compiler] Slide duration: ${slideDuration}s per image`);

    // 6. Write FFmpeg Concat Playlist file
    const concatFilePath = path.join(tempDir, "slideshow.txt");
    let concatContent = "";
    
    for (const imgPath of downloadedImages) {
      // Normalize Windows slashes for FFmpeg text files
      const normalizedPath = imgPath.replace(/\\/g, "/");
      concatContent += `file '${normalizedPath}'\n`;
      concatContent += `duration ${slideDuration}\n`;
    }
    // FFmpeg requires listing the last file twice to apply the final duration
    const lastImgPath = downloadedImages[downloadedImages.length - 1].replace(/\\/g, "/");
    concatContent += `file '${lastImgPath}'\n`;

    await fs.promises.writeFile(concatFilePath, concatContent);

    // 7. Compile video with FFmpeg
    console.log("[Video Compiler] Invoking FFmpeg renderer...");

    const hasBackgroundMusic = fs.existsSync(backgroundMusicPath);
    let ffmpegCmd = "";

    if (hasBackgroundMusic) {
      // Overlay slides, play voiceover, play background music at 8% volume, trim to voiceover duration
      ffmpegCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatFilePath.replace(/\\/g, "/")}" -i "${audioPath.replace(/\\/g, "/")}" -i "${backgroundMusicPath.replace(/\\/g, "/")}" -filter_complex "[1:a]volume=1.0[a1];[2:a]volume=0.08[a2];[a1][a2]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:v libx264 -r 25 -pix_fmt yuv420p -shortest "${outputVideoPath.replace(/\\/g, "/")}"`;
    } else {
      // Overlay slides and play voiceover only
      ffmpegCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatFilePath.replace(/\\/g, "/")}" -i "${audioPath.replace(/\\/g, "/")}" -map 0:v -map 1:a -c:v libx264 -r 25 -pix_fmt yuv420p -shortest "${outputVideoPath.replace(/\\/g, "/")}"`;
    }

    return new Promise<VideoCompilerResult>((resolve) => {
      exec(ffmpegCmd, (err, stdout, stderr) => {
        // Clean up temp directory
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (rmErr) {
          console.warn("[Video Compiler] Temporary directory cleanup failed:", rmErr);
        }

        if (err) {
          console.error("[Video Compiler] FFmpeg execution failed:", stderr || stdout);
          resolve({
            success: false,
            videoUrl: "",
            message: `FFmpeg rendering failed: ${err.message}`,
          });
        } else {
          console.log(`[Video Compiler] Success! Video saved to: /videos/${queueItemId}.mp4`);
          resolve({
            success: true,
            videoUrl: `/videos/${queueItemId}.mp4`,
            message: "Slideshow video successfully generated with voiceover and transitions.",
          });
        }
      });
    });
  } catch (error: any) {
    console.error("[Video Compiler] Compilation exception:", error);
    // Cleanup on exception
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}

    return {
      success: false,
      videoUrl: "",
      message: error.message || "Unknown error during video compilation",
    };
  }
}
