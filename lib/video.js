import { exec } from "child_process";
import fs from "fs";
import path from "path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import prisma from "@/lib/prisma";

const ffmpegPath = ffmpegInstaller.path;



/**
 * Gets the exact duration of an audio file in seconds by running a quick info inspect in FFmpeg.
 */
function getAudioDuration(audioPath) {
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
 * Uploads a local file to the free temporary file hosting API tmpfiles.org
 * so Shotstack's cloud servers can fetch it.
 */
async function uploadToTmpFiles(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "audio/mpeg" });
  const formData = new FormData();
  formData.append("file", blob, path.basename(filePath));

  const response = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload audio to tmpfiles: status ${response.status}`);
  }

  const json = await response.json();
  if (!json.data || !json.data.url) {
    throw new Error("Invalid response structure from tmpfiles.org");
  }

  // Convert view URL (https://tmpfiles.org/12345/file.mp3) to direct download link (https://tmpfiles.org/dl/12345/file.mp3)
  const viewUrl = json.data.url;
  const downloadUrl = viewUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  return downloadUrl;
}

/**
 * Helper to select the correct Shotstack endpoint based on the API Key
 */
function getShotstackUrl(apiKey) {
  const isStage = apiKey.startsWith("svis") || apiKey.includes("stage") || apiKey === "svisvAVcAi8mBi3P6O7MFFViBfO4cIARtdnqhLoC";
  const baseUrl = isStage ? "https://api.shotstack.io/stage" : "https://api.shotstack.io/v1";
  
  return {
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  };
}

/**
 * Queries Shotstack for the current status of an active render job.
 */
export async function checkShotstackStatus(renderId, apiKey) {
  const { baseUrl, headers } = getShotstackUrl(apiKey);
  
  const response = await fetch(`${baseUrl}/render/${renderId}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Shotstack render status lookup failed: status ${response.status}`);
  }

  const json = await response.json();
  const status = json.response?.status;
  const url = json.response?.url;
  const error = json.response?.error;

  return { status, url, error };
}

/**
 * Generates subtitle clips synced with the voiceover duration.
 * Text is styled for high engagement (centered, uppercase, yellow, bold).
 */
function getSubtitleClips(scriptText, audioDuration) {
  // Clean all cues and brackets
  const cleanedText = scriptText
    .replace(/\[Visuals?.*?\]/gi, "")
    .replace(/\[Audio?.*?\]/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanedText.split(/\s+/);
  const totalWordsCount = words.length;

  if (totalWordsCount === 0) return [];

  // Group into 5-word phrases
  const phraseWordsLimit = 5;
  const phrases = [];
  let tempPhrase = [];

  for (const w of words) {
    tempPhrase.push(w);
    if (tempPhrase.length >= phraseWordsLimit) {
      phrases.push(tempPhrase);
      tempPhrase = [];
    }
  }
  if (tempPhrase.length > 0) {
    phrases.push(tempPhrase);
  }

  let currentStart = 0;
  const clips = [];

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const phraseText = phrase.join(" ").toUpperCase();
    const wCount = phrase.length;
    // Calculate duration proportional to word count
    const duration = parseFloat(((wCount / totalWordsCount) * audioDuration).toFixed(2));

    clips.push({
      asset: {
        type: "html",
        html: `<p align="center">${phraseText}</p>`,
        css: `
          p {
            font-family: 'Impact', sans-serif;
            font-size: 28px;
            color: #facc15;
            text-align: center;
            text-shadow: 2px 2px 4px #000000;
            padding: 10px;
            margin: 0;
          }
        `,
      },
      start: parseFloat(currentStart.toFixed(2)),
      length: duration,
      position: "center", // Centered so it is not covered by YouTube UI overlays
      transition: {
        in: "fade",
        out: "fade",
      },
    });

    currentStart += duration;
  }

  return clips;
}

/**
 * Triggers a Shotstack cloud slideshow compilation with audio and subtitles overlay.
 */
export async function compileSlideshowVideo(queueItemId, searchQuery, userId) {
  const audioPath = path.join(
    require("os").tmpdir(),
    `${queueItemId}.mp3`,
  );

  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`TTS audio file not found at: ${audioPath}`);
    }

    // 1. Fetch credentials
    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const apifyApiKey = settings?.apifyApiKey || process.env.APIFY_API_KEY;
    if (!apifyApiKey) {
      throw new Error("Apify API key is not configured in settings or environment.");
    }

    const shotstackApiKey = settings?.shotstackApiKey || process.env.SHOTSTACK_API_KEY;
    if (!shotstackApiKey) {
      throw new Error("Shotstack API key is not configured in settings or environment.");
    }

    // 2. Fetch the script details for subtitles
    const item = await prisma.contentQueue.findUnique({
      where: { id: queueItemId },
    });
    if (!item) {
      throw new Error("Post item not found in queue.");
    }

    // 3. Upload the TTS voiceover MP3 to tmpfiles.org for public access
    console.log(`[Shotstack Compiler] Uploading voiceover to tmpfiles.org: ${queueItemId}`);
    const publicAudioUrl = await uploadToTmpFiles(audioPath);
    console.log(`[Shotstack Compiler] Public audio hosted at: ${publicAudioUrl}`);

    // 4. Search Google Images via Apify
    console.log(`[Shotstack Compiler] Scraping Google Images for: "${searchQuery}"`);
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
      throw new Error(`Apify Google Images scraper failed: ${errorText}`);
    }

    const scrapedItems = await apifyResponse.json();
    if (!Array.isArray(scrapedItems) || scrapedItems.length === 0) {
      throw new Error("Apify Google Images scraper returned empty results.");
    }

    const imageUrls = scrapedItems
      .map((item) => item.imageUrl || item.image)
      .filter((url) => typeof url === "string" && url.startsWith("http"));

    if (imageUrls.length === 0) {
      throw new Error("No valid image URLs extracted from Apify dataset.");
    }

    // 5. Calculate slide durations based on voiceover MP3 duration
    const audioDuration = await getAudioDuration(audioPath);
    const slideDuration = parseFloat((audioDuration / imageUrls.length).toFixed(2));

    console.log(`[Shotstack Compiler] Slideshow timeline: ${imageUrls.length} images for ${audioDuration}s total (${slideDuration}s per image)`);

    // 6. Build Image Clips Track
    const imageClips = imageUrls.map((url, index) => {
      const start = parseFloat((index * slideDuration).toFixed(2));
      return {
        asset: {
          type: "image",
          src: url,
        },
        start,
        length: slideDuration,
        effect: index % 2 === 0 ? "zoomIn" : "zoomOut",
      };
    });

    // 7. Build Subtitles Clips Track
    const subtitleClips = getSubtitleClips(item.shortsScript || "", audioDuration);

    const timeline = {
      background: "#000000",
      tracks: [
        // Track 0 (Topmost Layer): Stylized Subtitles
        {
          clips: subtitleClips,
        },
        // Track 1 (Middle Layer): Slideshow Images
        {
          clips: imageClips,
        },
        // Track 2 (Bottom Layer): Audio elements
        {
          clips: [
            // Voiceover track
            {
              asset: {
                type: "audio",
                src: publicAudioUrl,
              },
              start: 0,
              length: audioDuration,
              volume: 1.0,
            },
            // Background music beat track (soft volume)
            {
              asset: {
                type: "audio",
                src: "https://assets.shotstack.io/music/chill.mp3",
              },
              start: 0,
              length: audioDuration,
              volume: 0.07,
            },
          ],
        },
      ],
    };

    const editPayload = {
      timeline,
      output: {
        format: "mp4",
        resolution: "mobile", // Vertical 540x960 Shorts layout
      },
    };

    // 8. Submit render task to Shotstack API
    const { baseUrl, headers } = getShotstackUrl(shotstackApiKey);
    console.log(`[Shotstack Compiler] Dispatching render request to Shotstack: ${baseUrl}/render`);
    
    const shotstackResponse = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers,
      body: JSON.stringify(editPayload),
    });

    if (!shotstackResponse.ok) {
      const errorText = await shotstackResponse.text();
      throw new Error(`Shotstack render request failed: status ${shotstackResponse.status}. Body: ${errorText}`);
    }

    const shotstackJson = await shotstackResponse.json();
    const renderId = shotstackJson.response?.id;

    if (!renderId) {
      throw new Error("Failed to retrieve Render ID from Shotstack response.");
    }

    console.log(`[Shotstack Compiler] Render initiated. ID: ${renderId}`);

    return {
      success: true,
      videoUrl: "", // initially empty, updated upon status check
      audioUrl: publicAudioUrl,
      renderId,
      message: "Shotstack cloud slideshow render successfully initiated.",
    };
  } catch (error) {
    console.error("[Shotstack Compiler] Exception:", error);
    return {
      success: false,
      videoUrl: "",
      audioUrl: "",
      renderId: "",
      message: error.message || "Unknown error during cloud video compilation",
    };
  }
}
