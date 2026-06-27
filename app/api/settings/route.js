import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const settings = await prisma.scheduleSettings.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      data: settings || {
        postingFrequency: "DAILY",
        preferredTime: "12:00",
        youtubeChannelId: "",
        groqApiKey: "",
        youtubeOAuth: "",
        googleClientId: "",
        googleClientSecret: "",
        youtubeClientId: "",
        youtubeClientSecret: "",
        youtubeRedirectUri: "",
        nextAuthUrl: "",
        cronSecret: "",
        apifyApiKey: process.env.APIFY_API_KEY || "",
        shotstackApiKey: process.env.SHOTSTACK_API_KEY || "",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const {
      postingFrequency,
      preferredTime,
      youtubeChannelId,
      groqApiKey,
      youtubeOAuth,
      googleClientId,
      googleClientSecret,
      youtubeClientId,
      youtubeClientSecret,
      youtubeRedirectUri,
      nextAuthUrl,
      cronSecret,
      apifyApiKey,
      shotstackApiKey,
    } = body;

    const updatedSettings = await prisma.scheduleSettings.upsert({
      where: { userId },
      update: {
        postingFrequency,
        preferredTime,
        youtubeChannelId,
        groqApiKey,
        youtubeOAuth,
        googleClientId,
        googleClientSecret,
        youtubeClientId,
        youtubeClientSecret,
        youtubeRedirectUri,
        nextAuthUrl,
        cronSecret,
        apifyApiKey: apifyApiKey || process.env.APIFY_API_KEY || "",
        shotstackApiKey: shotstackApiKey || process.env.SHOTSTACK_API_KEY || "",
      },
      create: {
        userId,
        postingFrequency,
        preferredTime,
        youtubeChannelId,
        groqApiKey,
        youtubeOAuth,
        googleClientId,
        googleClientSecret,
        youtubeClientId,
        youtubeClientSecret,
        youtubeRedirectUri,
        nextAuthUrl,
        cronSecret,
        apifyApiKey: apifyApiKey || process.env.APIFY_API_KEY || "",
        shotstackApiKey: shotstackApiKey || process.env.SHOTSTACK_API_KEY || "",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database settings successfully updated.",
      data: updatedSettings,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
