import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { id, scheduledFor } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json({ error: "Queue item not found." }, { status: 404 });
    }

    // 1. Calculate posting time (defaulting to settings or next daily block)
    let scheduledDate = item.scheduledFor;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
    } else if (!scheduledDate) {
      const settings = await prisma.scheduleSettings.findUnique({
        where: { userId },
      });
      const preferredTimeStr = settings?.preferredTime || "12:00";
      const [hours, minutes] = preferredTimeStr.split(":").map(Number);
      
      scheduledDate = new Date();
      scheduledDate.setUTCHours(hours, minutes, 0, 0);
      if (scheduledDate.getTime() <= Date.now()) {
        scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
      }
    }

    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: {
        status: "scheduled",
        scheduledFor: scheduledDate,
        queuedAt: new Date(),
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      status: "scheduled",
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Video Approve Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
