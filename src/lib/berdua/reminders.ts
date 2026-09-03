import { prisma } from "@/lib/prisma";
import type { PairMember, PairMessage } from "@prisma/client";
import { sendPushToUser } from "./push";
import {
  MINUTE_MS,
  formatDuration,
  isQuietAt,
  minutesUntilQuietEnds,
  shiftOutOfQuietHours,
} from "./time";

export interface OutstandingRun {
  /** Pesan paling awal yang belum kebales - dari sini jam reminder dihitung. */
  anchor: PairMessage;
  latest: PairMessage;
  /** Berapa pesan nyantol tanpa balasan. */
  count: number;
  urgent: boolean;
}

/**
 * Cari rentetan pesan yang jadi "utang balasan" milik targetUserId:
 * semua pesan dari pasangannya setelah pesan terakhir yang dia kirim.
 */
export async function findOutstandingRun(
  pairId: string,
  targetUserId: string
): Promise<OutstandingRun | null> {
  const lastOwn = await prisma.pairMessage.findFirst({
    where: { pairId, senderId: targetUserId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const incoming = await prisma.pairMessage.findMany({
    where: {
      pairId,
      senderId: { not: targetUserId },
      ...(lastOwn ? { createdAt: { gt: lastOwn.createdAt } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const needingReply = incoming.filter((m) => m.needsReply);
  if (needingReply.length === 0) return null;

  return {
    anchor: needingReply[0],
    latest: incoming[incoming.length - 1],
    count: incoming.length,
    urgent: needingReply.some((m) => m.priority === "urgent"),
  };
}

export async function cancelRemindersFor(pairId: string, targetUserId: string) {
  await prisma.replyReminder.updateMany({
    where: { pairId, targetUserId, status: "pending" },
    data: { status: "cancelled" },
  });
}

function ladderFor(member: PairMember, urgent: boolean): number[] {
  const raw = urgent ? member.urgentLadder : member.reminderLadder;
  return Array.from(new Set(raw.filter((m) => m > 0))).sort((a, b) => a - b);
}

/**
 * Hitung ulang jadwal reminder untuk orang yang lagi punya utang balasan.
 * Jamnya dihitung dari pesan pertama yang nyantol, jadi kirim pesan beruntun
 * gak nge-reset hitungan.
 */
export async function syncRemindersFor(pairId: string, targetUserId: string) {
  const member = await prisma.pairMember.findFirst({
    where: { pairId, userId: targetUserId },
  });
  if (!member) return;

  const run = await findOutstandingRun(pairId, targetUserId);
  if (!run || !member.remindersEnabled) {
    await cancelRemindersFor(pairId, targetUserId);
    return;
  }

  const ladder = ladderFor(member, run.urgent);
  if (ladder.length === 0) {
    await cancelRemindersFor(pairId, targetUserId);
    return;
  }

  // Buang jadwal yang nempel di pesan lama atau tingkat yang udah gak dipakai.
  await prisma.replyReminder.deleteMany({
    where: {
      pairId,
      targetUserId,
      status: "pending",
      OR: [{ messageId: { not: run.anchor.id } }, { step: { gte: ladder.length } }],
    },
  });

  const existing = await prisma.replyReminder.findMany({
    where: { pairId, targetUserId, messageId: run.anchor.id },
  });

  for (let step = 0; step < ladder.length; step += 1) {
    const target = new Date(run.anchor.createdAt.getTime() + ladder[step] * MINUTE_MS);
    let dueAt = shiftOutOfQuietHours(target, member);
    if (member.snoozedUntil && member.snoozedUntil > dueAt) {
      dueAt = member.snoozedUntil;
    }

    const found = existing.find((r) => r.step === step);
    if (!found) {
      await prisma.replyReminder.create({
        data: { pairId, messageId: run.anchor.id, targetUserId, step, dueAt },
      });
    } else if (found.status === "pending" && found.dueAt.getTime() !== dueAt.getTime()) {
      await prisma.replyReminder.update({ where: { id: found.id }, data: { dueAt } });
    }
  }
}

function preview(content: string, max = 90): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function buildReminderText(options: {
  step: number;
  waitedMs: number;
  partnerName: string;
  messageContent: string;
  count: number;
  urgent: boolean;
}): { title: string; body: string } {
  const { step, waitedMs, partnerName, messageContent, count, urgent } = options;
  const waited = formatDuration(waitedMs);
  const extra = count > 1 ? ` (${count} pesan nyantol)` : "";

  if (urgent) {
    return {
      title: `⚡ ${partnerName} nandain ini penting`,
      body: `Udah ${waited} belum dibales${extra}. "${preview(messageContent)}"`,
    };
  }

  switch (step) {
    case 0:
      return {
        title: `${partnerName} nungguin dibales`,
        body: `"${preview(messageContent)}" — udah ${waited}${extra}.`,
      };
    case 1:
      return {
        title: "Masih ngegantung nih",
        body: `Pesan ${partnerName} udah ${waited} nunggu${extra}. Bales sepatah dua patah aja cukup.`,
      };
    case 2:
      return {
        title: `${partnerName} udah nunggu ${waited}`,
        body: `Lagi sibuk? Kirim "nanti gw bales ya" biar dia gak nebak-nebak.`,
      };
    default:
      return {
        title: `${waited} belum kebales`,
        body: `Ini yang bikin dia ngerasa keskip. Bales sekarang, walau cuma satu baris.`,
      };
  }
}

/**
 * Sapu ulang semua ruang yang masih aktif dan hitung ulang jadwalnya.
 * Ini jaring pengaman: kalau ada sinkronisasi yang gagal (koneksi DB putus
 * pas kirim pesan, misalnya), tick cron berikutnya bakal benerin sendiri.
 */
export async function resyncActivePairs(sinceDays = 30, limit = 200): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const pairs = await prisma.pair.findMany({
    where: { messages: { some: { createdAt: { gte: since } } } },
    select: { id: true, members: { select: { userId: true } } },
    take: limit,
  });

  for (const pair of pairs) {
    for (const member of pair.members) {
      await syncRemindersFor(pair.id, member.userId).catch((error) =>
        console.error("Resync gagal:", pair.id, member.userId, error)
      );
    }
  }

  return pairs.length;
}

export interface DispatchResult {
  processed: number;
  sent: number;
  cancelled: number;
  deferred: number;
  skipped: number;
}

/**
 * Dijalanin berkala (cron). Ngirim reminder yang udah jatuh tempo,
 * sekaligus bersihin yang udah kadaluarsa karena keburu dibales.
 */
export async function dispatchDueReminders(now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = {
    processed: 0,
    sent: 0,
    cancelled: 0,
    deferred: 0,
    skipped: 0,
  };

  const due = await prisma.replyReminder.findMany({
    where: { status: "pending", dueAt: { lte: now } },
    orderBy: [{ dueAt: "asc" }, { step: "asc" }],
    take: 200,
    include: { message: true },
  });
  if (due.length === 0) return result;

  // Kalau beberapa tingkat jatuh tempo bareng (mis. abis jam tenang),
  // cuma tingkat tertinggi yang dikirim biar gak spam beruntun.
  const byTarget = new Map<string, typeof due>();
  for (const reminder of due) {
    const key = `${reminder.pairId}:${reminder.targetUserId}`;
    const bucket = byTarget.get(key);
    if (bucket) bucket.push(reminder);
    else byTarget.set(key, [reminder]);
  }

  for (const bucket of Array.from(byTarget.values())) {
    result.processed += bucket.length;
    bucket.sort((a, b) => a.step - b.step);
    const winner = bucket[bucket.length - 1];
    const superseded = bucket.slice(0, -1);

    if (superseded.length > 0) {
      result.skipped += superseded.length;
      await prisma.replyReminder.updateMany({
        where: { id: { in: superseded.map((r) => r.id) } },
        data: { status: "skipped" },
      });
    }

    const member = await prisma.pairMember.findFirst({
      where: { pairId: winner.pairId, userId: winner.targetUserId },
      include: { user: { select: { name: true } } },
    });
    if (!member || !member.remindersEnabled) {
      result.cancelled += 1;
      await cancelRemindersFor(winner.pairId, winner.targetUserId);
      continue;
    }

    // Cek ulang: bisa jadi udah dibales sejak jadwal ini dibikin.
    const run = await findOutstandingRun(winner.pairId, winner.targetUserId);
    if (!run || run.anchor.id !== winner.messageId) {
      result.cancelled += 1;
      await cancelRemindersFor(winner.pairId, winner.targetUserId);
      continue;
    }

    // Jangan bangunin orang tengah malam - geser ke pagi.
    const snoozedUntil =
      member.snoozedUntil && member.snoozedUntil > now ? member.snoozedUntil : null;
    if (snoozedUntil) {
      result.deferred += 1;
      await prisma.replyReminder.update({
        where: { id: winner.id },
        data: { dueAt: snoozedUntil },
      });
      continue;
    }
    if (isQuietAt(now, member)) {
      result.deferred += 1;
      await prisma.replyReminder.update({
        where: { id: winner.id },
        data: {
          dueAt: new Date(now.getTime() + minutesUntilQuietEnds(now, member) * MINUTE_MS),
        },
      });
      continue;
    }

    const partner = await prisma.pairMember.findFirst({
      where: { pairId: winner.pairId, userId: { not: winner.targetUserId } },
      include: { user: { select: { name: true } } },
    });
    const partnerName = partner?.nickname?.trim() || partner?.user.name || "Dia";

    const { title, body } = buildReminderText({
      step: winner.step,
      waitedMs: now.getTime() - run.anchor.createdAt.getTime(),
      partnerName,
      messageContent: run.anchor.content,
      count: run.count,
      urgent: run.urgent,
    });

    await sendPushToUser(winner.targetUserId, {
      title,
      body,
      tag: `berdua-reminder-${winner.pairId}`,
      url: "/berdua",
      renotify: true,
    });

    await prisma.notification.create({
      data: {
        userId: winner.targetUserId,
        type: "berdua_reminder",
        title,
        message: body,
        link: "/berdua",
      },
    }).catch((e) => console.error("Gagal bikin notifikasi reminder:", e));

    await prisma.replyReminder.update({
      where: { id: winner.id },
      data: { status: "sent", sentAt: now },
    });
    result.sent += 1;
  }

  return result;
}
