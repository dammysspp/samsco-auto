"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ExternalLink,
  Edit2,
  X,
  Check,
  Play,
  Volume2,
  RefreshCw,
  Trash2,
  History,
  CheckSquare,
  ArrowLeft,
  Youtube,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ScriptVersion {
  timestamp: string;
  script: string;
  caption: string;
  type: string;
}

interface QueueItem {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  articleSource: string | null;
  status: string;
  shortsScript: string | null;
  scriptVersions: string | null;
  communityCaption: string | null;
  voiceName: string | null;
  scheduledFor: Date | null;
  postedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  videoUrl: string | null;
  audioUrl: string | null;
  shotstackRenderId: string | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  createdAt: Date;
  scriptGeneratedAt: Date | null;
  scriptApprovedAt: Date | null;
  audioGeneratedAt: Date | null;
  renderSubmittedAt: Date | null;
  renderCompletedAt: Date | null;
  queuedAt: Date | null;
  publishingStartedAt: Date | null;
}

export default function PipelineList({ initialItems }: { initialItems: QueueItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<string>("drafts");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editShortsScript, setEditShortsScript] = useState("");
  const [editCommunityCaption, setEditCommunityCaption] = useState("");
  const [showHistoryItemId, setShowHistoryItemId] = useState<string | null>(null);

  // Date rescheduling state
  const [reschedulingItemId, setReschedulingItemId] = useState<string | null>(null);
  const [editScheduledFor, setEditScheduledFor] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    if (!mounted) return "...";
    return new Date(date).toLocaleString();
  };

  const formatForInput = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  // Helper to trigger API actions
  const triggerApi = async (url: string, body: object, successMessage: string) => {
    const id = (body as any).id;
    if (id) setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data.data } : item))
      );
      setSuccessMsg(successMessage);
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 1. Generate Script
  const generateScript = (id: string) => triggerApi("/api/script/generate", { id }, "Script generated successfully!");

  // 2. Regenerate Script
  const regenerateScript = (id: string) => triggerApi("/api/script/regenerate", { id }, "New script version generated!");

  // 3. Edit & Save Script Changes
  const saveScriptEdits = async (id: string) => {
    setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, shortsScript: editShortsScript, communityCaption: editCommunityCaption }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data.data } : item)));
      setEditingItemId(null);
      setSuccessMsg("Manual edits saved to script history!");
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 4. Restore Version
  const restoreVersion = async (id: string, index: number) => {
    setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, restoreVersionIndex: index }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Restore failed");

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data.data } : item)));
      setSuccessMsg(`Restored script to version v${index + 1}!`);
      setShowHistoryItemId(null);
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 5. Approve Script -> Audio Generation
  const approveScript = (id: string) => triggerApi("/api/script/approve", { id }, "Script approved! Audio rendering initiated.");

  // 6. Retry Audio
  const retryAudio = (id: string) => triggerApi("/api/audio/retry", { id }, "Retrying Google TTS narration...");

  // 7. Check Rendering Status
  const checkRenderStatus = async (id: string) => {
    setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/render/status?id=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Render check failed");

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data.data } : item)));
      
      if (data.status === "done") {
        setSuccessMsg("Shotstack rendering finished! S3 cloud outputs loaded.");
      } else {
        setSuccessMsg(`Shotstack is currently: ${data.status}...`);
      }
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 8. Retry Video Render
  const retryRender = (id: string) => triggerApi("/api/render/retry", { id }, "Retrying Shotstack video render...");

  // 9. Approve Video -> Scheduled Queue
  const approveVideo = (id: string) => triggerApi("/api/video/approve", { id }, "Video approved and queued for scheduling.");

  // 10. Return to Script Review
  const returnToScriptReview = async (id: string) => {
    setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, restoreVersionIndex: 0 }), // Reverts to first version type but leaves editable
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Return failed");

      // Set status to review_script manually
      const updatedResponse = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scheduledFor: null }),
      });
      const updateData = await updatedResponse.json();

      await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      // Update local item status back to review_script
      const itemsResponse = await fetch(`/api/pipeline`);
      const itemsData = await itemsResponse.json();
      if (itemsData.success) {
        // Direct override of status
        setItems(itemsData.data);
      }
      
      setSuccessMsg("Post returned to Script Review.");
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 11. Publish Now
  const publishNow = (id: string) => triggerApi("/api/publish", { id }, "Successfully uploaded and published to YouTube Shorts!");

  // 12. Retry Publish
  const retryPublish = (id: string) => triggerApi("/api/publish/retry", { id }, "Retrying YouTube Shorts upload...");

  // 13. Reschedule Post Date/Time
  const saveReschedule = async (id: string) => {
    setLoadingItemId(id);
    setApiError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scheduledFor: editScheduledFor ? new Date(editScheduledFor).toISOString() : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reschedule failed");

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data.data } : item)));
      setReschedulingItemId(null);
      setSuccessMsg("Publish schedule updated successfully!");
      router.refresh();
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  // 14. Delete Draft
  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    setLoadingItemId(id);
    setApiError(null);
    try {
      const response = await fetch(`/api/pipeline?id=${id}`, { method: "DELETE" }); // Standard delete mapping
      if (!response.ok) {
        // Fallback to updating status as deleted
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
      setSuccessMsg("Draft removed successfully.");
    } catch (err: any) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setLoadingItemId(null);
    }
  };

  // Dynamic grouping of items based on activeTab
  const getTabItems = () => {
    switch (activeTab) {
      case "drafts":
        return items.filter((item) => item.status === "draft" || item.status === "script_generating");
      case "script_review":
        return items.filter((item) => item.status === "review_script");
      case "audio_gen":
        return items.filter((item) => item.status === "audio_generating" || item.status === "audio_failed");
      case "rendering":
        return items.filter((item) => item.status === "rendering_video" || item.status === "render_failed");
      case "video_review":
        return items.filter((item) => item.status === "review_video");
      case "scheduled":
        return items.filter((item) => item.status === "scheduled" || item.status === "publishing" || item.status === "publish_failed");
      case "published":
        return items.filter((item) => item.status === "posted");
      default:
        return items;
    }
  };

  const filteredItems = getTabItems();

  return (
    <div className="space-y-6">
      {/* Workflow Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-850 pb-px">
        {[
          { key: "drafts", label: "Drafts", count: items.filter((i) => i.status === "draft" || i.status === "script_generating").length },
          { key: "script_review", label: "Script Review", count: items.filter((i) => i.status === "review_script").length },
          { key: "audio_gen", label: "Audio Gen", count: items.filter((i) => i.status === "audio_generating" || i.status === "audio_failed").length },
          { key: "rendering", label: "Rendering", count: items.filter((i) => i.status === "rendering_video" || i.status === "render_failed").length },
          { key: "video_review", label: "Video Review", count: items.filter((i) => i.status === "review_video").length },
          { key: "scheduled", label: "Scheduled", count: items.filter((i) => i.status === "scheduled" || i.status === "publishing" || i.status === "publish_failed").length },
          { key: "published", label: "Published", count: items.filter((i) => i.status === "posted").length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setApiError(null);
              setSuccessMsg(null);
            }}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              activeTab === tab.key
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              activeTab === tab.key ? "bg-emerald-950 text-emerald-300" : "bg-zinc-900 text-zinc-500"
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {apiError && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {apiError}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Pipeline Cards */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-850 rounded-xl">
          <p className="text-zinc-500 text-xs">No posts currently in this stage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isEditing = editingItemId === item.id;
            const isRescheduling = reschedulingItemId === item.id;
            const isHistoryOpen = showHistoryItemId === item.id;
            const isLoading = loadingItemId === item.id;

            // Parse version history
            let historyList: ScriptVersion[] = [];
            try {
              if (item.scriptVersions) historyList = JSON.parse(item.scriptVersions);
            } catch (_) {}

            return (
              <div
                key={item.id}
                className={`border rounded-xl transition-all duration-200 p-5 space-y-4 ${
                  isLoading 
                    ? "border-amber-500/30 bg-zinc-950/20 pointer-events-none opacity-80" 
                    : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/60"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1 shrink-0 md:max-w-xl">
                    <h3 className="font-bold text-zinc-200 text-base flex items-center gap-2">
                      {item.title}
                      {item.status.includes("failed") && (
                        <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-950 text-red-400 border border-red-500/20 uppercase tracking-wider">
                          <AlertTriangle size={10} /> Failed
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {item.description || "No description provided."}
                    </p>
                  </div>

                  {/* Dynamic Action Buttons per Tab */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    
                    {/* DRAFTS ACTIONS */}
                    {activeTab === "drafts" && (
                      <>
                        <button
                          onClick={() => generateScript(item.id)}
                          disabled={isLoading || item.status === "script_generating"}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                        >
                          {item.status === "script_generating" ? (
                            <>
                              <Loader2 size={13} className="animate-spin" /> Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} /> Generate Script
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-950/10 rounded-lg transition-all cursor-pointer"
                          title="Delete Draft"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}

                    {/* SCRIPT REVIEW ACTIONS */}
                    {activeTab === "script_review" && (
                      <>
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditShortsScript(item.shortsScript || "");
                                setEditCommunityCaption(item.communityCaption || "");
                              }}
                              className="flex items-center gap-1 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                            >
                              <Edit2 size={12} /> Edit Script
                            </button>
                            <button
                              onClick={() => regenerateScript(item.id)}
                              className="flex items-center gap-1 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                            >
                              <RefreshCw size={12} /> Regenerate
                            </button>
                            <button
                              onClick={() => approveScript(item.id)}
                              className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                            >
                              <CheckSquare size={13} /> Approve Script
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveScriptEdits(item.id)}
                              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              <Check size={14} /> Save Changes
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="flex items-center gap-1 px-3 py-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* AUDIO GEN ACTIONS */}
                    {activeTab === "audio_gen" && (
                      <>
                        {item.status === "audio_generating" && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-xs font-semibold text-zinc-400">
                            <Loader2 size={12} className="animate-spin text-amber-500" />
                            Rendering Voiceover...
                          </div>
                        )}
                        {item.status === "audio_failed" && (
                          <button
                            onClick={() => retryAudio(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-all"
                          >
                            <RefreshCw size={13} /> Retry Audio
                          </button>
                        )}
                      </>
                    )}

                    {/* RENDERING VIDEO ACTIONS */}
                    {activeTab === "rendering" && (
                      <>
                        {item.status === "rendering_video" && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-xs font-semibold text-zinc-400">
                              <Loader2 size={12} className="animate-spin text-violet-500" />
                              Compiling Video...
                            </div>
                            <button
                              onClick={() => checkRenderStatus(item.id)}
                              className="flex items-center gap-1 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                            >
                              <RefreshCw size={12} /> Check Status
                            </button>
                          </div>
                        )}
                        {item.status === "render_failed" && (
                          <button
                            onClick={() => retryRender(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-all"
                          >
                            <RefreshCw size={13} /> Retry Render
                          </button>
                        )}
                      </>
                    )}

                    {/* VIDEO REVIEW ACTIONS */}
                    {activeTab === "video_review" && (
                      <>
                        <button
                          onClick={() => returnToScriptReview(item.id)}
                          className="flex items-center gap-1 px-3 py-2 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                        >
                          <ArrowLeft size={12} /> Edit Script
                        </button>
                        <button
                          onClick={() => retryRender(item.id)}
                          className="flex items-center gap-1 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                        >
                          <RefreshCw size={12} /> Re-Render
                        </button>
                        <button
                          onClick={() => approveVideo(item.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-all"
                        >
                          <CheckSquare size={13} /> Approve & Queue
                        </button>
                      </>
                    )}

                    {/* SCHEDULED QUEUE ACTIONS */}
                    {activeTab === "scheduled" && (
                      <>
                        {item.status === "publishing" && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-850 bg-zinc-900/30 text-xs font-semibold text-zinc-400">
                            <Loader2 size={12} className="animate-spin text-emerald-500" />
                            Uploading to Shorts...
                          </div>
                        )}
                        {item.status === "publish_failed" && (
                          <button
                            onClick={() => retryPublish(item.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer transition-all"
                          >
                            <RefreshCw size={13} /> Retry Publish
                          </button>
                        )}
                        {item.status === "scheduled" && (
                          <>
                            {!isRescheduling ? (
                              <button
                                onClick={() => {
                                  setReschedulingItemId(item.id);
                                  setEditScheduledFor(formatForInput(item.scheduledFor));
                                }}
                                className="flex items-center gap-1 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-lg bg-zinc-900 transition-all cursor-pointer"
                              >
                                <Calendar size={12} /> Reschedule
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="datetime-local"
                                  value={editScheduledFor}
                                  onChange={(e) => setEditScheduledFor(e.target.value)}
                                  className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                                />
                                <button
                                  onClick={() => saveReschedule(item.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => setReschedulingItemId(null)}
                                  className="p-1.5 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => publishNow(item.id)}
                              className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-all"
                            >
                              <Youtube size={13} /> Publish Now
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* PUBLISHED ACTIONS */}
                    {activeTab === "published" && item.youtubeUrl && (
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-lg shadow cursor-pointer transition-all"
                      >
                        <ExternalLink size={13} /> View on YouTube
                      </a>
                    )}

                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-900/50 transition-all"
                        title="Original Article"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Audit Timestamps & Errors */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-zinc-500 pt-2 border-t border-zinc-900">
                  <span>Created: {formatDate(item.createdAt)}</span>
                  {item.scriptGeneratedAt && <span>Script Gen: {formatDate(item.scriptGeneratedAt)}</span>}
                  {item.renderCompletedAt && <span>Rendered: {formatDate(item.renderCompletedAt)}</span>}
                  {item.scheduledFor && (
                    <span className="flex items-center gap-1 text-blue-400 font-semibold">
                      <Calendar size={11} /> Scheduled: {formatDate(item.scheduledFor)}
                    </span>
                  )}
                  {item.postedAt && (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 size={11} /> Published: {formatDate(item.postedAt)}
                    </span>
                  )}
                  {item.retryCount > 0 && <span className="text-amber-500 font-mono">Retries: {item.retryCount}</span>}
                </div>

                {/* Error Box */}
                {item.errorMessage && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-400 space-y-1">
                    <span className="font-semibold block">Execution Log Error:</span>
                    <p className="font-mono">{item.errorMessage}</p>
                  </div>
                )}

                {/* INLINE EDITORS & SCRIPT DRAWERS */}

                {/* 1. Version History Drawer */}
                {activeTab === "script_review" && historyList.length > 1 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowHistoryItemId(isHistoryOpen ? null : item.id)}
                      className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                    >
                      <History size={12} />
                      {isHistoryOpen ? "Hide Version History" : `View Versions (${historyList.length})`}
                    </button>
                    
                    {isHistoryOpen && (
                      <div className="mt-2 p-3 bg-zinc-950 rounded-lg border border-zinc-850 space-y-2 text-xs">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">History Tree</span>
                        {historyList.map((hist, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-zinc-900 pb-1.5 last:border-0 last:pb-0">
                            <div className="space-y-0.5">
                              <span className="font-mono text-[10px] text-zinc-400">v{idx + 1} - {hist.type}</span>
                              <span className="text-[10px] text-zinc-500 block">{formatDate(hist.timestamp)}</span>
                            </div>
                            {idx < historyList.length - 1 && (
                              <button
                                onClick={() => restoreVersion(item.id, idx)}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Media Players (Review Stage) */}
                {(activeTab === "video_review" || activeTab === "scheduled" || activeTab === "published") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-850 bg-zinc-900/10">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                        <Volume2 size={12} className="text-emerald-500" />
                        Voiceover Audio (TTS)
                      </span>
                      <audio
                        src={item.audioUrl || `/audio/${item.id}.mp3`}
                        controls
                        className="w-full h-10 bg-zinc-950 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                        <Play size={12} className="text-sky-400" />
                        Slideshow Video (Shotstack S3 CDN)
                      </span>
                      {item.videoUrl ? (
                        <div className="relative aspect-video max-w-sm rounded-lg overflow-hidden border border-zinc-800 bg-black">
                          <video
                            src={item.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic block pt-1.5">S3 Video compilation not loaded. Check Status.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Text areas for Script reviewing / manual editing */}
                {((item.shortsScript || item.communityCaption) && activeTab === "script_review") && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-zinc-900 animate-fadeIn">
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <FileText size={14} className="text-emerald-500" />
                        Shorts Script Text
                      </span>
                      {isEditing ? (
                        <textarea
                          value={editShortsScript}
                          onChange={(e) => setEditShortsScript(e.target.value)}
                          rows={8}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-xs font-sans leading-relaxed focus:outline-none focus:border-emerald-500"
                        />
                      ) : (
                        <pre className="text-xs font-sans text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-2">
                          {item.shortsScript}
                        </pre>
                      )}
                    </div>

                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-500" />
                        Community Tab Caption
                      </span>
                      {isEditing ? (
                        <textarea
                          value={editCommunityCaption}
                          onChange={(e) => setEditCommunityCaption(e.target.value)}
                          rows={8}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 text-xs font-sans leading-relaxed focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-2">
                          {item.communityCaption || "No caption generated."}
                        </p>
                      )}
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
