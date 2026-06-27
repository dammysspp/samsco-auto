"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2, Chrome, Terminal } from "lucide-react";

export default function LoginButton() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDev, setLoadingDev] = useState(false);

  const handleGoogleSignIn = () => {
    setLoadingGoogle(true);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleDevSignIn = () => {
    setLoadingDev(true);
    signIn("credentials", {
      email: "admin@fifa2026.com",
      password: "password123",
      callbackUrl: "/dashboard",
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      {/* Google OAuth Login */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle || loadingDev}
        className="flex items-center justify-center gap-3 w-full px-5 py-3.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer"
      >
        {loadingGoogle ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Chrome size={16} />
        )}
        Continue with Google
      </button>

      {/* Developer Fallback Credentials Bypass */}
      <button
        onClick={handleDevSignIn}
        disabled={loadingGoogle || loadingDev}
        className="flex items-center justify-center gap-3 w-full px-5 py-3.5 bg-zinc-905 border border-zinc-800 hover:border-zinc-700 disabled:border-zinc-900 disabled:text-zinc-700 text-zinc-400 hover:text-zinc-200 font-semibold rounded-xl transition-all text-xs cursor-pointer"
      >
        {loadingDev ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Terminal size={12} />
        )}
        Developer Sandbox Quick Access
      </button>
    </div>
  );
}
