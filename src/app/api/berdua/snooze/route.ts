import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { syncRemindersFor } from "@/lib/berdua/reminders";
import { MINUTE_MS } from "@/lib/berdua/time";

const snoozeSchema = z.object({
  minutes: z.number().int().min(0).max(24 * 60),
});

/** "Iya iya, ingetin lagi nanti." minutes = 0 buat batalin snooze. */
export async function POST(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  try {
    const { minutes } = snoozeSchema.parse(await request.json());
    const snoozedUntil = minutes > 0 ? new Date(Date.now() + minutes * MINUTE_MS) : null;

    await prisma.pairMember.update({
      where: { userId: ctx.userId },
      data: { snoozedUntil },
    });
    await syncRemindersFor(ctx.pair.id, ctx.userId);

    return NextResponse.json({ snoozedUntil });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Snooze error:", error);
    return NextResponse.json({ error: "Gagal nunda reminder" }, { status: 500 });
  }
}
