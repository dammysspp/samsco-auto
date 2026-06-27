import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const clientId = settings?.youtubeClientId || process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = settings?.youtubeClientSecret || process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = settings?.youtubeRedirectUri || process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "YouTube Client ID, Client Secret, or Redirect URI are missing in settings." },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
      state: userId,
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("YouTube Auth redirect error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
