"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: "forum_post" | "forum_reply" | "new_message";
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch from API + poll every 30s
  useEffect(() => {
    if (!user) return;

    // Load from localStorage cache
    try {
      const cached = localStorage.getItem("notifications");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    } catch {}

    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const notifs = data.notifications || [];
          setNotifications(notifs);
          localStorage.setItem("notifications", JSON.stringify(notifs));
        }
      } catch {}
    };

    // Initial fetch
    fetchNotifs();

    // Poll every 30 seconds (no socket.io on Vercel serverless)
    pollRef.current = setInterval(fetchNotifs, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  // When new messages are sent, poll immediately
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && pollRef.current) {
        // Fetch immediately when user comes back
        const token = localStorage.getItem("token");
        if (token) {
          fetch("/api/notifications", {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.ok && r.json()).then(data => {
            const notifs = data.notifications || [];
            setNotifications(notifs);
            localStorage.setItem("notifications", JSON.stringify(notifs));
          }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user]);

  const addNotification = useCallback(
    (notif: Omit<Notification, "id" | "read" | "createdAt">) => {
      const newNotif: Notification = {
        id: `local-${Date.now()}`,
        ...notif,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Update backend
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ readAll: true }),
      }).catch(() => {});
    }
    // Update localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("notifications") || "[]");
      localStorage.setItem(
        "notifications",
        JSON.stringify(stored.map((n: Notification) => ({ ...n, read: true })))
      );
    } catch {}
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    // Update backend
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId: id }),
      }).catch(() => {});
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
