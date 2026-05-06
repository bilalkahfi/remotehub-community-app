"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  MessageSquare,
  Users,
  Mic,
  Bell,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const serverIcons = [
  { href: "/forum", icon: Home, label: "Forum", color: "bg-accent" },
  { href: "/chat", icon: MessageCircle, label: "Chat", color: "bg-orange-600" },
  { href: "/messages", icon: MessageSquare, label: "Messages", color: "bg-green-600" },
  { href: "/members", icon: Users, label: "Members", color: "bg-blue-600" },
  { href: "/voice", icon: Mic, label: "Voice", color: "bg-purple-600" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center w-[72px] bg-[var(--bg-tertiary)] flex-shrink-0 py-3 gap-2 relative">
      {/* Home/logo */}
      <Link
        href="/"
        className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-lg hover:rounded-xl transition-all duration-200 flex-shrink-0"
        title="RemoteHub"
      >
        RH
      </Link>

      {/* Separator */}
      <div className="w-8 h-[2px] rounded-full bg-[var(--bg-modifier-accent)]" />

      {/* Server icons */}
      <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto">
        {serverIcons.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl ${
                isActive
                  ? "rounded-xl bg-accent text-white"
                  : `${item.color} text-white/80 hover:text-white`
              }`}
              title={item.label}
            >
              <span
                className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white transition-all duration-200 ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                }`}
              />
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl hover:bg-[var(--bg-hover)]"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <svg className="w-5 h-5 text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User avatar with dropdown menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl"
              title={user.name}
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-tertiary)]" />
            </button>

            {/* User dropdown - appears to the left of the sidebar */}
            {showUserMenu && (
              <div className="absolute bottom-0 left-full ml-3 w-56 bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--bg-modifier-accent)] overflow-hidden z-50">
                {/* User info header */}
                <div className="p-3 border-b border-[var(--bg-modifier-accent)]">
                  <p className="text-sm font-semibold text-[var(--header-primary)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href={`/members/${user.id}`}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-normal)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href={`/members/${user.id}`}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-normal)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-[var(--bg-modifier-accent)] py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
