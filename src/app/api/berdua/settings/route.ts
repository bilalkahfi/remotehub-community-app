import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { syncRemindersFor } from "@/lib/berdua/reminders";

function serialize(member: {
  nickname: string | null;
  remindersEnabled: boolean;
  reminderLadder: number[];
  urgentLadder: number[];
  quietStartMinute: number;
  quietEndMinute: number;
  tzOffsetMinutes: number;
  snoozedUntil: Date | null;
}) {
  return {
    nickname: member.nickname,
    remindersEnabled: member.remindersEnabled,
    reminderLadder: member.reminderLadder,
    urgentLadder: member.urgentLadder,
    quietStartMinute: member.quietStartMinute,
    quietEndMinute: member.quietEndMinute,
    tzOffsetMinutes: member.tzOffsetMinutes,
    snoozedUntil: member.snoozedUntil,
  };
}

export async function GET(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  return NextResponse.json({ settings: serialize(guard.data.me) });
}

const ladderSchema = z
  .array(z.number().int().min(1).max(7 * 24 * 60))
  .min(1)
  .max(6);

const patchSchema = z.object({
  nickname: z.string().trim().max(40).nullable().optional(),
  remindersEnabled: z.boolean().optional(),
  reminderLadder: ladderSchema.optional(),
  urgentLadder: ladderSchema.optional(),
  quietStartMinute: z.number().int().min(0).max(1439).optional(),
  quietEndMinute: z.number().int().min(0).max(1439).optional(),
  tzOffsetMinutes: z.number().int().min(-720).max(840).optional(),
});

export async function PATCH(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  try {
    const data = patchSchema.parse(await request.json());

    const normalized = {
      ...data,
      ...(data.reminderLadder
        ? { reminderLadder: Array.from(new Set(data.reminderLadder)).sort((a, b) => a - b) }
        : {}),
      ...(data.urgentLadder
        ? { urgentLadder: Array.from(new Set(data.urgentLadder)).sort((a, b) => a - b) }
        : {}),
    };

    const member = await prisma.pairMember.update({
      where: { userId: ctx.userId },
      data: normalized,
    });

    // Jadwal yang lagi jalan ikut nyesuain tangga/jam tenang yang baru.
    await syncRemindersFor(ctx.pair.id, ctx.userId);

    return NextResponse.json({ settings: serialize(member) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update setelan berdua error:", error);
    return NextResponse.json({ error: "Gagal nyimpen setelan" }, { status: 500 });
  }
}
