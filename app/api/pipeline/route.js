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

    const items = await prisma.contentQueue.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const {
      id,
      shortsScript,
      communityCaption,
      scheduledFor,
      restoreVersionIndex,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing queue item ID" },
        { status: 400 },
      );
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      );
    }

    const updateFields = {};
    let versionsList = [];
    try {
      if (item.scriptVersions) {
        versionsList = JSON.parse(item.scriptVersions);
      }
    } catch (_) {}

    // Version restoring
    if (
      restoreVersionIndex !== undefined &&
      Array.isArray(versionsList) &&
      versionsList[restoreVersionIndex]
    ) {
      const targetVersion = versionsList[restoreVersionIndex];
      updateFields.shortsScript = targetVersion.script;
      updateFields.communityCaption = targetVersion.caption;
      // Log the restore event
      versionsList.push({
        timestamp: new Date().toISOString(),
        script: targetVersion.script,
        caption: targetVersion.caption,
        type: `restored_from_v${restoreVersionIndex + 1}`,
      });
      updateFields.scriptVersions = JSON.stringify(versionsList);
    } else {
      // Manual edits
      let scriptEdited = false;
      if (shortsScript !== undefined && shortsScript !== item.shortsScript) {
        updateFields.shortsScript = shortsScript;
        scriptEdited = true;
      }
      if (
        communityCaption !== undefined &&
        communityCaption !== item.communityCaption
      ) {
        updateFields.communityCaption = communityCaption;
        scriptEdited = true;
      }

      if (scriptEdited) {
        versionsList.push({
          timestamp: new Date().toISOString(),
          script:
            shortsScript !== undefined ? shortsScript : item.shortsScript || "",
          caption:
            communityCaption !== undefined
              ? communityCaption
              : item.communityCaption || "",
          type: "manual_edit",
        });
        updateFields.scriptVersions = JSON.stringify(versionsList);
      }
    }

    if (scheduledFor !== undefined) {
      updateFields.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    }

    const updatedItem = await prisma.contentQueue.update({
      where: { id },
      data: updateFields,
    });

    return NextResponse.json({
      success: true,
      message: "Post updated successfully.",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Pipeline PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing queue item ID" },
        { status: 400 },
      );
    }

    const item = await prisma.contentQueue.findFirst({
      where: { id, userId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Queue item not found" },
        { status: 404 },
      );
    }

    await prisma.contentQueue.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully.",
    });
  } catch (error) {
    console.error("Pipeline DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
