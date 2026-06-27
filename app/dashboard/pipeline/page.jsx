import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PipelineList from "@/components/PipelineList";

export default async function PipelinePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Retrieve all queue items for the active user
  const rawItems = await prisma.contentQueue.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Cast Dates to match client contract
  const items = rawItems.map((item) => ({
    ...item,
    createdAt: item.createdAt,
    scheduledFor: item.scheduledFor,
    postedAt: item.postedAt,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">
          Content Pipeline
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Review, generate scripts, and inspect publications in your football
          production queue.
        </p>
      </div>

      <PipelineList initialItems={items} />
    </div>
  );
}
