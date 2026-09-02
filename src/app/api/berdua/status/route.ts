import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { findOutstandingRun } from "@/lib/berdua/reminders";
import { computePairStats } from "@/lib/berdua/stats";
import { isQuietAt } from "@/lib/berdua/time";

export async function GET(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;
  const now = new Date();

  const partnerId = ctx.partner?.userId ?? null;

  const [myRun, partnerRun, nextReminder, unread] = await Promise.all([
    findOutstandingRun(ctx.pair.id, ctx.userId),
    partnerId ? findOutstandingRun(ctx.pair.id, partnerId) : Promise.resolve(null),
    prisma.replyReminder.findFirst({
      where: { pairId: ctx.pair.id, targetUserId: ctx.userId, status: "pending" },
      orderBy: { dueAt: "asc" },
    }),
    prisma.pairMessage.count({
      where: { pairId: ctx.pair.id, senderId: { not: ctx.userId }, readAt: null },
    }),
  ]);

  const stats = await computePairStats(
    ctx.pair.id,
    partnerId ? [ctx.userId, partnerId] : [ctx.userId]
  );

  const describeRun = (run: Awaited<ReturnType<typeof findOutstandingRun>>) =>
    run
      ? {
          since: run.anchor.createdAt,
          waitedMs: now.getTime() - run.anchor.createdAt.getTime(),
          count: run.count,
          urgent: run.urgent,
          preview: run.anchor.content.slice(0, 120),
        }
      : null;

  return NextResponse.json({
    now,
    // Utang balasan gw ke dia.
    iOwe: describeRun(myRun),
    // Utang balasan dia ke gw.
    partnerOwes: describeRun(partnerRun),
    nextReminder: nextReminder
      ? { dueAt: nextReminder.dueAt, step: nextReminder.step }
      : null,
    unread,
    snoozedUntil: ctx.me.snoozedUntil,
    remindersEnabled: ctx.me.remindersEnabled,
    inQuietHours: isQuietAt(now, ctx.me),
    partner: ctx.partner
      ? { userId: ctx.partner.userId, lastSeenAt: ctx.partner.lastSeenAt }
      : null,
    stats,
  });
}
