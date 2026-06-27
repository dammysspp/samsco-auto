import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";
import LoginButton from "@/components/LoginButton";
import { Trophy, RefreshCw, Cpu, Youtube, Clock } from "lucide-react";

export default async function IndexPage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, bypass login and redirect to the dashboard
  if (session) {
    redirect("/dashboard");
  }

  const features = [
    {
      title: "Real-Time News Ingestion",
      description: "Parses ESPN and Sky Sports RSS feeds dynamically, extracting the latest updates from the 2026 FIFA World Cup matches.",
      icon: RefreshCw,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Groq Llama 3 generation",
      description: "Writes engaging YouTube Shorts scripts (hooks and timestamps) and poll-style Community posts in seconds.",
      icon: Cpu,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Direct YouTube uploads",
      description: "Integrates with YouTube Data API v3, managing upload streams, categories, tags, and description parameters.",
      icon: Youtube,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
    },
    {
      title: "Serverless scheduling",
      description: "Utilizes Vercel Cron jobs and Prisma PostgreSQL to run hourly background checks and dispatch videos.",
      icon: Clock,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
  ];

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Header navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
            <Trophy size={18} />
          </div>
          <span className="font-bold text-sm text-zinc-100 tracking-wider">FIFA 2026 AUTO-DASHBOARD</span>
        </div>
        <div className="text-xs text-zinc-500 font-medium">Tournament Edition</div>
      </header>

      {/* Hero content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10 flex-grow">
        {/* Left column info */}
        <div className="flex-1 space-y-6 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            FIFA 2026 World Cup In Progress
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-100 leading-tight">
            Automated Football Content <span className="text-emerald-400 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Powerhouse</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Ingest live match results, generate high-retention YouTube Shorts scripts, build community tab engagement polls via Groq Llama-3-70b, and automate posting schedules with Vercel Cron.
          </p>

          {/* Features bullet grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className={`p-4 rounded-xl border ${feat.color} bg-zinc-900/10 space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-zinc-200 text-xs">
                    <Icon size={14} className="shrink-0" />
                    {feat.title}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column Login panel */}
        <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex flex-col items-center justify-center space-y-6 relative shadow-2xl">
          <div className="absolute -inset-px bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-2xl -z-10 blur-sm" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">Sign In to Dashboard</h2>
            <p className="text-xs text-zinc-500">Lock down your credentials and publication pipelines securely.</p>
          </div>

          <LoginButton />

          <p className="text-[9px] text-zinc-600 text-center max-w-xs leading-normal">
            By signing in, you connect your workspace to your local Prisma PostgreSQL instance.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-500 gap-4">
          <span>&copy; 2026 Football Content Pipeline. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400">Prisma Postgres</span>
            <span className="hover:text-zinc-400">Groq SDK</span>
            <span className="hover:text-zinc-400">Vercel Serverless</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
