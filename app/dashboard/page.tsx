import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import OverviewActions from "@/components/OverviewActions";
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Database,
  ExternalLink
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Fetch Stats in parallel
  const [
    totalCount,
    draftCount,
    scheduledCount,
    postedCount,
    failedCount,
    upcomingPosts,
  ] = await Promise.all([
    prisma.contentQueue.count({ where: { userId } }),
    prisma.contentQueue.count({ where: { userId, status: "draft" } }),
    prisma.contentQueue.count({ where: { userId, status: "scheduled" } }),
    prisma.contentQueue.count({ where: { userId, status: "posted" } }),
    prisma.contentQueue.count({ where: { userId, status: "failed" } }),
    prisma.contentQueue.findMany({
      where: { userId, status: "scheduled" },
      orderBy: { scheduledFor: "asc" },
      take: 3,
    }),
  ]);

  const stats = [
    { name: "Total Ingested", value: totalCount, icon: Database, color: "text-zinc-400 bg-zinc-900 border-zinc-800" },
    { name: "Drafts Queue", value: draftCount, icon: FileText, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { name: "Scheduled Posts", value: scheduledCount, icon: Calendar, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { name: "Published Shorts", value: postedCount, icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { name: "Failed Attempts", value: failedCount, icon: AlertTriangle, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">Overview</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Welcome back, {session?.user?.name || "Football Creator"}. Here is your FIFA 2026 World Cup pipeline status.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className={`p-5 rounded-xl border flex flex-col justify-between ${stat.color} bg-zinc-950/60 backdrop-blur-md`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{stat.name}</span>
                <Icon size={18} />
              </div>
              <span className="text-3xl font-bold mt-4 tracking-tight text-zinc-100">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Interactive Actions Panel */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Automation Trigger Control</h2>
        <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
          Ingest new RSS articles focusing on the active stages of the FIFA 2026 World Cup, or force dispatch the scheduled items directly to your YouTube Channel.
        </p>
        <OverviewActions />
      </div>

      {/* Upcoming Post Schedule Queue */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Next Up In Queue</h2>
        {upcomingPosts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No content scheduled. Ingest news and generate scripts to populate the queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Scheduled Release (UTC)</th>
                  <th className="py-3 px-4 text-right">Source Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {upcomingPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-200 max-w-sm truncate">{post.title}</td>
                    <td className="py-3 px-4">
                      {post.scheduledFor ? new Date(post.scheduledFor).toUTCString() : "Pending time assignment"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {post.sourceUrl ? (
                        <a 
                          href={post.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                        >
                          Link <ExternalLink size={12} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
