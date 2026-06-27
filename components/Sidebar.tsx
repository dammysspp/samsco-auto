"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Layers, 
  Calendar, 
  Settings, 
  LogOut, 
  Trophy,
  User
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Content Pipeline", href: "/dashboard/pipeline", icon: Layers },
    { name: "YouTube Scheduler", href: "/dashboard/scheduler", icon: Calendar },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between h-screen sticky top-0 text-zinc-100">
      <div className="flex flex-col flex-1 py-6">
        {/* Brand / Logo */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="p-2 bg-emerald-600 rounded-lg text-white animate-pulse">
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-emerald-400">FIFA 2026</h1>
            <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Auto-Dashboard</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
                }`}
              >
                <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Info & Logout */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-3 px-2 py-3 mb-2">
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || "User Avatar"} 
              className="w-10 h-10 rounded-full border border-zinc-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
              <User size={18} />
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-zinc-200 truncate">{session?.user?.name || "Football Creator"}</p>
            <p className="text-[10px] text-zinc-500 truncate">{session?.user?.email || "creator@fifa2026.com"}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
