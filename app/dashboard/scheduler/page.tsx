import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Calendar, Clock, CheckCircle, ArrowRight, PlayCircle } from "lucide-react";

export default async function SchedulerPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Retrieve current active scheduler settings
  const settings = await prisma.scheduleSettings.findUnique({
    where: { userId },
  });

  // Query scheduled and posted items for timeline display
  const timelineItems = await prisma.contentQueue.findMany({
    where: {
      userId,
      status: { in: ["scheduled", "posted"] },
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">YouTube Scheduler</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Monitor your automation schedule, posting times, and publication history.
        </p>
      </div>

      {/* Scheduler Active Summary Card */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Cadence</span>
            <p className="text-base font-bold text-zinc-200">{settings?.postingFrequency || "DAILY"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Preferred Time</span>
            <p className="text-base font-bold text-zinc-200">{settings?.preferredTime || "12:00"} UTC</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
            <PlayCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Target Channel ID</span>
            <p className="text-xs font-mono text-zinc-300 truncate max-w-[180px]">
              {settings?.youtubeChannelId || "Not Connected"}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Schedule */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100">Chronological Posting Timeline</h2>

        {timelineItems.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No content scheduled or published. The scheduler calendar is empty.</p>
        ) : (
          <div className="relative border-l border-zinc-800 ml-4 space-y-8 py-2">
            {timelineItems.map((item) => {
              const isPosted = item.status === "posted";
              const displayDate = isPosted ? item.postedAt : item.scheduledFor;
              return (
                <div key={item.id} className="relative pl-8">
                  {/* Indicator Dot */}
                  <span className={`absolute -left-[9px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border ${
                    isPosted 
                      ? "bg-emerald-950 border-emerald-500 text-emerald-400" 
                      : "bg-blue-950 border-blue-500 text-blue-400"
                  }`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>

                  <div className="space-y-1 bg-zinc-950/50 p-4 rounded-lg border border-zinc-850 max-w-3xl">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-zinc-500 font-medium">
                        {displayDate ? new Date(displayDate).toLocaleString() : "Unassigned"}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border ${
                        isPosted 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-zinc-200 text-sm">{item.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {isPosted ? "Successfully uploaded video & posted to channel tab." : item.description}
                    </p>

                    {!isPosted && (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 pt-1">
                        <span>Awaiting Automatic Posting Workflow</span>
                        <ArrowRight size={10} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
