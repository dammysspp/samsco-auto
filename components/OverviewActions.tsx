"use client";

import { useState } from "react";
import { RefreshCw, Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OverviewActions() {
  const router = useRouter();
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });

  const triggerIngest = async () => {
    setLoadingIngest(true);
    setStatusMessage({ text: "", type: "" });
    try {
      const response = await fetch("/api/ingest", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to ingest news");
      
      setStatusMessage({
        text: `Ingestion success! Added ${data.count || 0} news items to draft.`,
        type: "success",
      });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setLoadingIngest(false);
    }
  };

  const triggerPublish = async () => {
    setLoadingPublish(true);
    setStatusMessage({ text: "", type: "" });
    try {
      const response = await fetch("/api/cron-trigger", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process queue");

      setStatusMessage({
        text: `Queue processing completed! Details: ${data.message}`,
        type: "success",
      });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setLoadingPublish(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* News Ingestion */}
        <button
          onClick={triggerIngest}
          disabled={loadingIngest || loadingPublish}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-zinc-400 text-white font-medium rounded-lg shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all text-sm"
        >
          {loadingIngest ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Ingest 2026 World Cup News
        </button>

        {/* Force Publish Scheduler */}
        <button
          onClick={triggerPublish}
          disabled={loadingIngest || loadingPublish}
          className="flex items-center gap-2 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-100 font-medium rounded-lg border border-zinc-700 active:scale-95 transition-all text-sm"
        >
          {loadingPublish ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          Process Scheduled Queue Now
        </button>
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-lg text-sm border ${
            statusMessage.type === "success"
              ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20"
              : "bg-red-950/30 text-red-400 border-red-500/20"
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
