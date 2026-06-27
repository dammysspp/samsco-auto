import { NextResponse } from "next/server";
import { google } from "googleapis";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const userId = searchParams.get("state");

    if (!code || !userId) {
      return NextResponse.json(
        { error: "Missing authorization code or state parameter." },
        { status: 400 }
      );
    }

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    const clientId = settings?.youtubeClientId || process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = settings?.youtubeClientSecret || process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = settings?.youtubeRedirectUri || process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "YouTube credentials not found for this user in settings." },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);

    await prisma.scheduleSettings.update({
      where: { userId },
      data: {
        youtubeOAuth: JSON.stringify(tokens),
      },
    });

    // Redirect back to settings page with success flag
    const appUrl = settings?.nextAuthUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUrl = new URL("/dashboard/settings", appUrl);
    redirectUrl.searchParams.set("success", "youtube");

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error("YouTube OAuth callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
