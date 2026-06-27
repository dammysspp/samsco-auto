import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await req.json();
    const { id, shortsScript, communityCaption, scheduledFor } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    // Verify item exists and belongs to the active user
    const contentItem = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!contentItem) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    const updateFields: any = {};
    if (shortsScript !== undefined) updateFields.shortsScript = shortsScript;
    if (communityCaption !== undefined) updateFields.communityCaption = communityCaption;
    
    if (scheduledFor !== undefined) {
      updateFields.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    }

    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: updateFields,
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled post updated successfully.",
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Pipeline PATCH route error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
