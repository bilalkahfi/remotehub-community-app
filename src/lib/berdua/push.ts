import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  /** Notif dengan tag sama saling menimpa, jadi lock screen gak kebanjiran. */
  tag?: string;
  url?: string;
  renotify?: boolean;
}

let vapidReady = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ensureVapid(): boolean {
  if (vapidReady) return true;
  if (!isPushConfigured()) return false;

  const subject =
    process.env.VAPID_SUBJECT ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "mailto:admin@example.com";

  webpush.setVapidDetails(
    subject.startsWith("http") || subject.startsWith("mailto:")
      ? subject
      : `mailto:${subject}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidReady = true;
  return true;
}

/**
 * Kirim push ke semua device milik satu user.
 * Subscription yang udah mati (404/410) langsung dibuang.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  if (!ensureVapid()) return { sent: 0, failed: 0, removed: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" }
        );
        sent += 1;
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date(), failureCount: 0 },
        });
      } catch (error: any) {
        failed += 1;
        const status = error?.statusCode;

        // Endpoint udah gak valid: browser di-uninstall / izin dicabut.
        if (status === 404 || status === 410 || sub.failureCount >= 4) {
          removed += 1;
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
          return;
        }

        await prisma.pushSubscription
          .update({
            where: { id: sub.id },
            data: { failureCount: { increment: 1 } },
          })
          .catch(() => undefined);
        console.error("Push gagal:", status, error?.body || error?.message);
      }
    })
  );

  return { sent, failed, removed };
}
