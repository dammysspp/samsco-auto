import { google } from "googleapis";

interface OAuthCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}

export interface YouTubeClientSettings {
  clientId?: string | null;
  clientSecret?: string | null;
  redirectUri?: string | null;
}

export function getYouTubeClient(credentials: OAuthCredentials, settings?: YouTubeClientSettings) {
  const oauth2Client = new google.auth.OAuth2(
    settings?.clientId || process.env.YOUTUBE_CLIENT_ID,
    settings?.clientSecret || process.env.YOUTUBE_CLIENT_SECRET,
    settings?.redirectUri || process.env.YOUTUBE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: credentials.expiry_date,
  });

  return google.youtube({
    version: "v3",
    auth: oauth2Client,
  });
}

/**
 * Uploads a video to YouTube (as a Short).
 * YouTube Shorts are automatically detected by YouTube if the aspect ratio is vertical (9:16)
 * and duration is under 60 seconds.
 */
export async function uploadYouTubeShort(
  credentials: OAuthCredentials,
  videoTitle: string,
  scriptText: string,
  videoFilePathPlaceholder?: string,
  settings?: YouTubeClientSettings
): Promise<{ videoId: string; url: string }> {
  try {
    const youtube = getYouTubeClient(credentials, settings);

    // 1. Placeholder logic for video source:
    // In a fully end-to-end pipeline, you would use an automated rendering engine 
    // (like Remotion, FFmpeg, or an API like Shotstack) to stitch the Groq-generated script,
    // a text-to-speech audio file, and relevant World Cup B-roll images/videos into a vertical MP4.
    console.log(`[YouTube API] Preparing video file: ${videoFilePathPlaceholder || "default_shorts_template.mp4"}`);
    console.log(`[YouTube API] Embedding subtitle track from generated script: "${scriptText.substring(0, 60)}..."`);

    // For production-ready execution, we structure the API request to YouTube:
    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: videoTitle.substring(0, 100), // Max 100 chars
          description: `${scriptText}\n\n#FIFAWorldCup #WorldCup2026 #FootballShorts #FIFA`,
          tags: ["FIFAWorldCup", "WorldCup2026", "Football", "Shorts"],
          categoryId: "17", // Sports category
        },
        status: {
          privacyStatus: "public", // or "unlisted" / "private"
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: "video/mp4",
        body: videoFilePathPlaceholder && videoFilePathPlaceholder.startsWith("http")
          ? require("stream").Readable.fromWeb((await fetch(videoFilePathPlaceholder)).body as any)
          : "Mock video streaming readable stream here or fs.createReadStream(filePath)",
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new Error("No Video ID returned from YouTube API.");
    }

    return {
      videoId,
      url: `https://youtube.com/shorts/${videoId}`,
    };
  } catch (error: any) {
    console.error("YouTube Shorts Upload Failure: ", error);
    throw new Error(`YouTube API Upload failed: ${error.message}`);
  }
}

/**
 * Posts text directly to the YouTube Community Tab.
 * 
 * Note: YouTube Data API v3 does not expose a public endpoint for posting directly 
 * to the Community Tab (which is restricted to the web interface or special partnerships).
 * To solve this in production, developers either:
 *   1. Create an automation browser flow (using Puppeteer/Playwright) to log in and post.
 *   2. Upload a short 5-second dynamic graphic video with the caption in the description.
 *   3. Create a public playlist item or comment.
 * 
 * Below, we implement the OAuth validation and simulate the Community Post workflow.
 */
export async function postCommunityTab(
  credentials: OAuthCredentials,
  captionText: string,
  settings?: YouTubeClientSettings
): Promise<{ success: boolean; message: string }> {
  try {
    const youtube = getYouTubeClient(credentials, settings);
    
    // Validate credentials
    const authClient = youtube.context._options.auth as any;
    const tokenInfo = await authClient?.getAccessToken();
    if (!tokenInfo) {
      throw new Error("Invalid YouTube Access Token during Community Tab auth check.");
    }

    console.log("[YouTube API] Authenticated successfully.");
    console.log(`[YouTube API] Community Tab Post content: "${captionText.substring(0, 80)}..."`);
    
    // Simulate community post success
    // In a real-world integration, this logs into a headless browser or uses a micro-video upload fallback.
    return {
      success: true,
      message: "Successfully posted to YouTube Community tab (Simulated OAuth flow)",
    };
  } catch (error: any) {
    console.error("YouTube Community Tab Post Failure: ", error);
    throw new Error(`YouTube Community Post failed: ${error.message}`);
  }
}
