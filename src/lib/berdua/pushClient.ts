"use client";

import { api } from "./client";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ ngaku-ngaku Mac.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Di iPhone, push cuma nyala kalau app-nya dibuka dari home screen. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function urlBase64ToApplicationServerKey(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output.buffer as ArrayBuffer;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/berdua-sw.js", { scope: "/berdua" });
  } catch (error) {
    console.error("Gagal daftarin service worker:", error);
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/berdua");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export interface EnablePushResult {
  ok: boolean;
  reason?: "unsupported" | "needs-install" | "denied" | "no-key" | "error";
}

export async function enablePush(publicKey: string | null): Promise<EnablePushResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: isIOS() && !isStandalone() ? "needs-install" : "unsupported" };
  }
  if (!publicKey) return { ok: false, reason: "no-key" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!registration) return { ok: false, reason: "error" };

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToApplicationServerKey(publicKey),
      }));

    await api("/api/berdua/push", {
      method: "POST",
      body: JSON.stringify(subscription.toJSON()),
    });
    return { ok: true };
  } catch (error) {
    console.error("Gagal langganan push:", error);
    return { ok: false, reason: "error" };
  }
}

export async function disablePush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  await api(`/api/berdua/push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
    method: "DELETE",
  }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}
