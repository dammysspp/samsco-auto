"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QueueItem {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  status: string;
  shortsScript: string | null;
  communityCaption: string | null;
  scheduledFor: Date | null;
  postedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export default function PipelineList({ initialItems }: { initialItems: QueueItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    if (!mounted) return "...";
    return new Date(date).toLocaleString();
  };

  const generateAIContent = async (itemId: string) => {
    setLoadingItemId(itemId);
    setApiError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate content");

      // Update local item status
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...data.data } : item))
      );
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">Draft</span>;
      case "scheduled":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduled</span>;
      case "posted":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span>;
      case "failed":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-zinc-850 pb-px">
        {["all", "draft", "scheduled", "posted", "failed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      {apiError && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {apiError}
        </div>
      )}

      {/* Pipeline Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-850 rounded-xl">
          <p className="text-zinc-500 text-sm">No items found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="border border-zinc-800 rounded-xl bg-zinc-950/40 hover:bg-zinc-950/60 transition-all duration-200 p-5 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-zinc-200 text-base">{item.title}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
                      {item.description || "No description provided."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {item.status === "draft" && (
                      <button
                        onClick={() => generateAIContent(item.id)}
                        disabled={loadingItemId !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md disabled:bg-emerald-800 disabled:text-zinc-400 transition-all"
                      >
                        {loadingItemId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Generate AI Scripts
                      </button>
                    )}

                    {(item.shortsScript || item.communityCaption) && (
                      <button
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all"
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff size={14} /> Hide Scripts
                          </>
                        ) : (
                          <>
                            <Eye size={14} /> Inspect Scripts
                          </>
                        )}
                      </button>
                    )}

                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-900/50 transition-all"
                        title="Original Article"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Metadata & Scheduled Time */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-zinc-500 pt-1 border-t border-zinc-900">
                  <span>Created: {formatDate(item.createdAt)}</span>
                  {item.scheduledFor && (
                    <span className="flex items-center gap-1 text-blue-400 font-medium">
                      <Calendar size={12} />
                      Scheduled: {formatDate(item.scheduledFor)}
                    </span>
                  )}
                  {item.postedAt && (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 size={12} />
                      Published: {formatDate(item.postedAt)}
                    </span>
                  )}
                </div>

                {/* Error Banner */}
                {item.status === "failed" && item.errorMessage && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-400 space-y-1">
                    <span className="font-semibold block">Execution Log / Error Message:</span>
                    <p className="font-mono">{item.errorMessage}</p>
                  </div>
                )}

                {/* Collapsible scripts drawer */}
                {isExpanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-zinc-900 animate-fadeIn">
                    {/* Shorts script */}
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <FileText size={14} className="text-emerald-500" />
                          YouTube Shorts Script (Llama-3-70b)
                        </span>
                      </div>
                      <pre className="text-xs font-sans text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-2">
                        {item.shortsScript}
                      </pre>
                    </div>

                    {/* Community Caption */}
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-blue-500" />
                          Community Caption
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-2">
                        {item.communityCaption}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
