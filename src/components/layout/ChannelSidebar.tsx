"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { useEffect, useState } from "react";
import { Hash, Volume2, ChevronDown, ChevronRight, Settings, Sun, Moon, LogOut, X, UserCog, LayoutDashboard, Shield, BookOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { posts: number };
}

interface ChannelSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChannelSidebar({ isOpen, onClose }: ChannelSidebarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Collapse states
  const [forumOpen, setForumOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  const isForum = pathname?.startsWith("/forum");
  const isChat = pathname?.startsWith("/chat");
  const isMembers = pathname?.startsWith("/members");
  const isVoice = pathname?.startsWith("/voice");
  const isAdmin = pathname?.startsWith("/admin");

  const userRole = (user as any)?.role;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setMembers(data.users || []))
      .catch(console.error);
  }, []);

  return (
    <>
    <div
      className={`
        flex flex-col w-60 bg-[var(--bg-secondary)]
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static
        fixed md:relative top-0 left-0 z-50 h-full
        transition-transform duration-200 ease-in-out
        flex-shrink-0
      `}
    >
      {/* Server name header */}
      <div className="h-[48px] flex items-center justify-between px-4 border-b border-[var(--bg-tertiary)] shadow-sm flex-shrink-0 cursor-pointer">
        <h2 className="font-semibold text-sm truncate">
          <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">RemoteHub</span>
        </h2>
        {/* Close button - visible on mobile when in overlay mode */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-2 discord-scrollbar">
        {/* === FORUM === */}
        <div>
          <button
            onClick={() => setForumOpen(!forumOpen)}
            className="flex items-center gap-1 px-2 py-1 w-full text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--interactive-hover)]"
          >
            {forumOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Forum
          </button>

          {forumOpen && (
            <div className="mt-0.5 space-y-0.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/forum/${cat.slug}`}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname?.startsWith(`/forum/${cat.slug}`)
                      ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                      : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                  }`}
                >
                  <Hash className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === CHAT (Global) === */}
        <div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-1 px-2 py-1 w-full text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--interactive-hover)]"
          >
            {chatOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Chat
          </button>

          {chatOpen && (
            <div className="mt-0.5 space-y-0.5">
              <Link
                href="/chat"
                onClick={onClose}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  isChat
                    ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                    : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                }`}
              >
                <Hash className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">umum</span>
              </Link>
            </div>
          )}
        </div>

        {/* === MATERI === */}
        <div>
          <Link
            href="/materials"
            onClick={onClose}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              pathname?.startsWith("/materials")
                ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Materi</span>
          </Link>
        </div>

        {/* === MEMBERS === */}
        <div>
          <button
            onClick={() => setMembersOpen(!membersOpen)}
            className="flex items-center gap-1 px-2 py-1 w-full text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--interactive-hover)]"
          >
            {membersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Members
          </button>

          {membersOpen && (
            <div className="mt-0.5 space-y-0.5">
              {members.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname === `/members/${m.id}`
                      ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                      : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                  }`}
                >
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-[9px] font-semibold overflow-hidden">
                      {m.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    {m.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--status-online)] border border-[var(--bg-secondary)]" />
                    )}
                  </div>
                  <span className="truncate text-sm">{m.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === VOICE === */}
        <div>
          <button
            onClick={() => setVoiceOpen(!voiceOpen)}
            className="flex items-center gap-1 px-2 py-1 w-full text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--interactive-hover)]"
          >
            {voiceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Voice
          </button>

          {voiceOpen && (
            <div className="mt-0.5 space-y-0.5">
              <Link
                href="/voice"
                onClick={onClose}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  isVoice
                    ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                    : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                }`}
              >
                <Volume2 className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">voice-chat</span>
              </Link>
            </div>
          )}
        </div>

        {/* === ADMIN (only for admin/owner) === */}
        {isAdminOrOwner && (
          <div>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex items-center gap-1 px-2 py-1 w-full text-[11px] font-semibold uppercase tracking-wider text-yellow-500/80 hover:text-yellow-400"
            >
              {adminOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Shield className="w-3 h-3" />
              Admin
            </button>

            {adminOpen && (
              <div className="mt-0.5 space-y-0.5">
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    isAdmin && pathname === "/admin"
                      ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                      : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Dashboard</span>
                </Link>
                <Link
                  href="/admin/users"
                  onClick={onClose}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    pathname?.startsWith("/admin/users")
                      ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                      : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)]"
                  }`}
                >
                  <UserCog className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">Users</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User profile at bottom */}
      <div className="h-[52px] flex items-center px-2 bg-[var(--bg-tertiary)] flex-shrink-0">
        {user && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-xs overflow-hidden flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-[var(--text-normal)] truncate leading-tight">{user.name}</p>
                <AdminBadge role={userRole} size="xs" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">Online</p>
            </div>
            <Link
              href={`/members/${user.id}`}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]"
              title="User Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShowLogoutConfirm(false)}>
          <div
            className="bg-[var(--bg-primary)] rounded-xl p-6 w-80 shadow-2xl border border-[var(--bg-modifier-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base text-[var(--header-primary)] mb-2">Logout</h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">Yakin ingin logout dari RemoteHub?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
