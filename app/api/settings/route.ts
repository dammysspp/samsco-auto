import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
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

    return NextResponse.json({
      success: true,
      data: settings || {
        postingFrequency: "DAILY",
        preferredTime: "12:00",
        youtubeChannelId: "",
        groqApiKey: "",
        youtubeOAuth: "",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await req.json();
    const {
      postingFrequency,
      preferredTime,
      youtubeChannelId,
      groqApiKey,
      youtubeOAuth,
    } = body;

    const updatedSettings = await prisma.scheduleSettings.upsert({
      where: { userId },
      update: {
        postingFrequency,
        preferredTime,
        youtubeChannelId,
        groqApiKey,
        youtubeOAuth,
      },
      create: {
        userId,
        postingFrequency,
        preferredTime,
        youtubeChannelId,
        groqApiKey,
        youtubeOAuth,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Schedule settings successfully updated.",
      data: updatedSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
