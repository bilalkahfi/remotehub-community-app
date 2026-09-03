import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { displayName } from "@/lib/berdua/pair";
import { notifyNewMessage } from "@/lib/berdua/notify";
import { syncRemindersFor } from "@/lib/berdua/reminders";

const MAX_PAGE = 100;

export async function GET(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limit = Math.min(Number(searchParams.get("limit")) || 60, MAX_PAGE);

  // ?after=<ISO> dipakai buat polling incremental biar hemat kuota.
  if (after) {
    const afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "Parameter after gak valid" }, { status: 400 });
    }
    const messages = await prisma.pairMessage.findMany({
      where: { pairId: ctx.pair.id, createdAt: { gt: afterDate } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: MAX_PAGE,
    });
    return NextResponse.json({ messages, incremental: true });
  }

  const before = searchParams.get("before");
  const beforeDate = before ? new Date(before) : null;
  const recent = await prisma.pairMessage.findMany({
    where: {
      pairId: ctx.pair.id,
      ...(beforeDate && !Number.isNaN(beforeDate.getTime())
        ? { createdAt: { lt: beforeDate } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    messages: recent.reverse(),
    hasMore: recent.length === limit,
    incremental: false,
  });
}

const sendSchema = z.object({
  content: z.string().trim().min(1, "Pesannya masih kosong").max(4000),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  needsReply: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  try {
    const data = sendSchema.parse(await request.json());

    const message = await prisma.pairMessage.create({
      data: {
        pairId: ctx.pair.id,
        senderId: ctx.userId,
        content: data.content,
        priority: data.priority,
        needsReply: data.needsReply,
      },
    });

    // Ngirim pesan = ngelunasin utang balasan sendiri.
    await syncRemindersFor(ctx.pair.id, ctx.userId);

    if (ctx.partner) {
      await syncRemindersFor(ctx.pair.id, ctx.partner.userId);
      await notifyNewMessage({
        pairId: ctx.pair.id,
        recipientId: ctx.partner.userId,
        senderName: displayName(ctx.me),
        content: data.content,
        urgent: data.priority === "urgent",
      });
    }

    await prisma.pairMember.update({
      where: { userId: ctx.userId },
      data: { lastSeenAt: new Date(), snoozedUntil: null },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Kirim pesan berdua error:", error);
    return NextResponse.json({ error: "Gagal ngirim pesan" }, { status: 500 });
  }
}
