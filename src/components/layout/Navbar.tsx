"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { Hash, Menu, X } from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function Navbar({ onToggleSidebar, sidebarOpen }: NavbarProps = {}) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't show navbar on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  const getPageTitle = () => {
    if (pathname?.startsWith("/forum")) return "Forum";
    if (pathname?.startsWith("/chat")) return "Chat";
    if (pathname?.startsWith("/messages")) return "Messages";
    if (pathname?.startsWith("/members")) return "Members";
    if (pathname?.startsWith("/voice")) return "Voice";
    if (pathname?.startsWith("/materials")) return "Materi";
    if (pathname?.startsWith("/admin")) return "Admin";
    if (pathname === "/") return "Home";
    return "RemoteHub";
  };

  // Get a sub-title for specific pages
  const getSubTitle = () => {
    if (pathname?.match(/^\/forum\/[^/]+$/)) return "Threads";
    if (pathname?.match(/^\/forum\/[^/]+\/[^/]+$/)) return "Post";
    if (pathname?.match(/^\/messages\/[^/]+$/)) return "Chat";
    if (pathname?.match(/^\/members\/[^/]+$/)) return "Profile";
    if (pathname?.match(/^\/admin\/users$/)) return "Users";
    return "";
  };

  return (
    <div className="h-[48px] flex items-center justify-between px-4 border-b border-[var(--bg-tertiary)] bg-gradient-to-r from-[var(--bg-primary)] to-[var(--bg-secondary)] flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-2 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)] flex-shrink-0"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#667eea] to-[#764ba2] flex-shrink-0" />
        <h1 className="font-semibold text-[15px] text-[var(--header-primary)] truncate">
          {getPageTitle()}
        </h1>
        {getSubTitle() && (
          <>
            <span className="text-[var(--text-muted)] text-sm flex-shrink-0">/</span>
            <span className="text-sm text-[var(--header-secondary)] truncate">
              {getSubTitle()}
            </span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationBell />
      </div>
    </div>
  );
}
