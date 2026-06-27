"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Key, Youtube, Sliders, Info, Eye, EyeOff, ShieldCheck, Chrome, Image } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showYoutubeSecret, setShowYoutubeSecret] = useState(false);
  const [showCronSecret, setShowCronSecret] = useState(false);
  const [showApifyKey, setShowApifyKey] = useState(false);
  
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    postingFrequency: "DAILY",
    preferredTime: "12:00",
    youtubeChannelId: "",
    groqApiKey: "",
    youtubeOAuth: "",
    googleClientId: "",
    googleClientSecret: "",
    youtubeClientId: "",
    youtubeClientSecret: "",
    youtubeRedirectUri: "",
    nextAuthUrl: "",
    cronSecret: "",
    apifyApiKey: "",
  });

  // Load current settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        const json = await response.json();
        if (response.ok && json.data) {
          setForm({
            postingFrequency: json.data.postingFrequency || "DAILY",
            preferredTime: json.data.preferredTime || "12:00",
            youtubeChannelId: json.data.youtubeChannelId || "",
            groqApiKey: json.data.groqApiKey || "",
            youtubeOAuth: json.data.youtubeOAuth || "",
            googleClientId: json.data.googleClientId || "",
            googleClientSecret: json.data.googleClientSecret || "",
            youtubeClientId: json.data.youtubeClientId || "",
            youtubeClientSecret: json.data.youtubeClientSecret || "",
            youtubeRedirectUri: json.data.youtubeRedirectUri || "",
            nextAuthUrl: json.data.nextAuthUrl || "",
            cronSecret: json.data.cronSecret || "",
            apifyApiKey: json.data.apifyApiKey || "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings: ", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      // Validate YouTube OAuth format
      if (form.youtubeOAuth.trim()) {
        try {
          JSON.parse(form.youtubeOAuth);
        } catch (je) {
          throw new Error("YouTube User OAuth Tokens must be a valid JSON object string.");
        }
      }

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to update settings");

      setSuccess("All database-stored settings configurations updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">Database Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Store your environment configurations directly inside the Neon database. (Only DATABASE_URL and NEXTAUTH_SECRET are required on Vercel).
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {success && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Cadence Panel */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Sliders className="text-emerald-500" size={20} />
            Publishing Cadence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="frequency" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Posting Frequency
              </label>
              <select
                id="frequency"
                value={form.postingFrequency}
                onChange={(e) => setForm({ ...form, postingFrequency: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="time" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Preferred Posting Time (UTC - HH:MM)
              </label>
              <input
                id="time"
                type="text"
                value={form.preferredTime}
                onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                placeholder="14:00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Google OAuth Login Configurations (NextAuth) */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Chrome className="text-blue-500" size={20} />
            Google Sign-In Credentials (DB-Stored)
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="googleId" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Google Client ID
              </label>
              <input
                id="googleId"
                type="text"
                value={form.googleClientId}
                onChange={(e) => setForm({ ...form, googleClientId: e.target.value })}
                placeholder="1234567890-abc.apps.googleusercontent.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label htmlFor="googleSecret" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Google Client Secret
              </label>
              <div className="relative">
                <input
                  id="googleSecret"
                  type={showGoogleSecret ? "text" : "password"}
                  value={form.googleClientSecret}
                  onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                  placeholder="GOCSPX-..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showGoogleSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Groq Credentials Panel */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Key className="text-amber-500" size={20} />
            Groq API Integration
          </h2>
          
          <div className="space-y-1.5 relative">
            <label htmlFor="groqKey" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Llama 3.3 API Key
            </label>
            <div className="relative">
              <input
                id="groqKey"
                type={showGroqKey ? "text" : "password"}
                value={form.groqApiKey}
                onChange={(e) => setForm({ ...form, groqApiKey: e.target.value })}
                placeholder="gsk_..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              >
                {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Apify Credentials Panel */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Image className="text-sky-400" size={20} />
            Apify Search API Integration (Google Images)
          </h2>
          
          <div className="space-y-1.5 relative">
            <label htmlFor="apifyKey" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Apify API Token
            </label>
            <div className="relative">
              <input
                id="apifyKey"
                type={showApifyKey ? "text" : "password"}
                value={form.apifyApiKey}
                onChange={(e) => setForm({ ...form, apifyApiKey: e.target.value })}
                placeholder="apify_api_..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApifyKey(!showApifyKey)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              >
                {showApifyKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* YouTube API Credentials Panel */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Youtube className="text-red-500" size={20} />
            YouTube Publishing Client Credentials
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ytClientId" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  YouTube Client ID
                </label>
                <input
                  id="ytClientId"
                  type="text"
                  value={form.youtubeClientId}
                  onChange={(e) => setForm({ ...form, youtubeClientId: e.target.value })}
                  placeholder="123-yt.apps.googleusercontent.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label htmlFor="ytClientSecret" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  YouTube Client Secret
                </label>
                <div className="relative">
                  <input
                    id="ytClientSecret"
                    type={showYoutubeSecret ? "text" : "password"}
                    value={form.youtubeClientSecret}
                    onChange={(e) => setForm({ ...form, youtubeClientSecret: e.target.value })}
                    placeholder="GOCSPX-yt..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowYoutubeSecret(!showYoutubeSecret)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showYoutubeSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ytRedirect" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                YouTube Redirect OAuth URI
              </label>
              <input
                id="ytRedirect"
                type="text"
                value={form.youtubeRedirectUri}
                onChange={(e) => setForm({ ...form, youtubeRedirectUri: e.target.value })}
                placeholder="https://yourdomain.vercel.app/api/auth/youtube/callback"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="channelId" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Target YouTube Channel ID
              </label>
              <input
                id="channelId"
                type="text"
                value={form.youtubeChannelId}
                onChange={(e) => setForm({ ...form, youtubeChannelId: e.target.value })}
                placeholder="UC..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="oauth" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                YouTube User OAuth Tokens (JSON String)
              </label>
              <textarea
                id="oauth"
                value={form.youtubeOAuth}
                onChange={(e) => setForm({ ...form, youtubeOAuth: e.target.value })}
                rows={4}
                placeholder={`{\n  "access_token": "...",\n  "refresh_token": "...",\n  "scope": "https://www.googleapis.com/auth/youtube.upload",\n  "token_type": "Bearer",\n  "expiry_date": 1713500000000\n}`}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-xs font-mono leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Cron Job Verification secret */}
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={20} />
            Cron Job Dispatch Secret Key
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5 relative">
              <label htmlFor="cronSec" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Vercel Cron Secret Passphrase
              </label>
              <div className="relative">
                <input
                  id="cronSec"
                  type={showCronSecret ? "text" : "password"}
                  value={form.cronSecret}
                  onChange={(e) => setForm({ ...form, cronSecret: e.target.value })}
                  placeholder="your_custom_cron_secret"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCronSecret(!showCronSecret)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showCronSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-900/50 rounded-lg border border-zinc-850 flex gap-2.5 items-start">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Provide a custom string here to protect your Vercel hourly cron endpoint. Vercel Cron will send this key in the request Authorization headers.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-zinc-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all text-sm cursor-pointer"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Settings to Database
        </button>
      </form>
    </div>
  );
}
