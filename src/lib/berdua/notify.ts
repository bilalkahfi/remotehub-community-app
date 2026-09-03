import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "./push";

function preview(content: string, max = 140): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Push pesan masuk. Sengaja gak kena jam tenang - ini chat biasa, bukan reminder. */
export async function notifyNewMessage(options: {
  pairId: string;
  recipientId: string;
  senderName: string;
  content: string;
  urgent: boolean;
}) {
  const { pairId, recipientId, senderName, content, urgent } = options;

  await sendPushToUser(recipientId, {
    title: urgent ? `⚡ ${senderName}` : senderName,
    body: preview(content),
    tag: `berdua-chat-${pairId}`,
    url: "/berdua",
    renotify: true,
  });

  await prisma.notification
    .create({
      data: {
        userId: recipientId,
        type: "berdua_message",
        title: senderName,
        message: preview(content, 100),
        link: "/berdua",
      },
    })
    .catch((e) => console.error("Gagal bikin notifikasi pesan:", e));
}

/** Colekan manual: "woy, bales dong". */
export async function notifyNudge(options: {
  pairId: string;
  recipientId: string;
  senderName: string;
  note?: string | null;
}) {
  const { pairId, recipientId, senderName, note } = options;
  const body = note?.trim()
    ? preview(note, 120)
    : "Nyolek nih. Bales dong, sebentar aja.";

  await sendPushToUser(recipientId, {
    title: `👉 ${senderName} nyolek lo`,
    body,
    tag: `berdua-nudge-${pairId}`,
    url: "/berdua",
    renotify: true,
  });

  await prisma.notification
    .create({
      data: {
        userId: recipientId,
        type: "berdua_nudge",
        title: `${senderName} nyolek lo`,
        message: body,
        link: "/berdua",
      },
    })
    .catch((e) => console.error("Gagal bikin notifikasi colekan:", e));
}
