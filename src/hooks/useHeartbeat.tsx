"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export function Heartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem("token");
        await fetch("/api/users/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    };

    // Send heartbeat immediately on mount
    sendHeartbeat();

    // Then every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Send heartbeat on page visibility change (user comes back)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Send heartbeat before page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during unload
      const token = localStorage.getItem("token");
      if (token) {
        navigator.sendBeacon?.("/api/users/heartbeat", JSON.stringify({}));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  return null;
}
