"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, MessageSquare, FileText, Reply, AtSign, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: "forum_post" | "forum_reply" | "new_message" | "mention" | "dm" | "warning";
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout>();

  // Load cached notifications from localStorage
  useEffect(() => {
    if (!user) return;
    const cached = localStorage.getItem("notifications");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
      } catch {}
    }
    fetchNotifications();
  }, [user]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      fetchNotifications();
    };
    pollRef.current = setInterval(poll, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const notifs = data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
      localStorage.setItem("notifications", JSON.stringify(notifs));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ readAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_message":
      case "dm":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "forum_post":
        return <FileText className="w-4 h-4 text-green-400" />;
      case "forum_reply":
        return <Reply className="w-4 h-4 text-yellow-400" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-pink-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)] transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--status-dnd)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-[var(--bg-primary)] rounded-lg shadow-2xl border border-[var(--bg-modifier-accent)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-modifier-accent)]">
            <h3 className="font-semibold text-sm text-[var(--header-primary)]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[var(--text-link)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto discord-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--bg-modifier-accent)]">
                {notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.link || "#"}
                    onClick={async () => {
                      setOpen(false);
                      // Mark individual notification as read via API
                      if (!notif.read) {
                        try {
                          const token = localStorage.getItem("token");
                          await fetch("/api/notifications", {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ notificationId: notif.id }),
                          });
                        } catch {}
                        setNotifications((prev) =>
                          prev.map((n) =>
                            n.id === notif.id ? { ...n, read: true } : n
                          )
                        );
                        setUnreadCount((c) => Math.max(0, c - 1));
                        // Sync to localStorage
                        try {
                          const stored = JSON.parse(localStorage.getItem("notifications") || "[]");
                          const updated = stored.map((n: any) => n.id === notif.id ? { ...n, read: true } : n);
                          localStorage.setItem("notifications", JSON.stringify(updated));
                        } catch {}
                      }
                    }}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] ${
                      !notif.read ? "bg-[#4752c4] dark:bg-[#3a45ad] border-l-[3px] border-[#8ea1e1] font-semibold text-white" : "opacity-70"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-normal)] truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
