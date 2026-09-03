import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { displayName } from "@/lib/berdua/pair";
import { notifyNudge } from "@/lib/berdua/notify";
import { isQuietAt, MINUTE_MS } from "@/lib/berdua/time";

const NUDGE_COOLDOWN_MINUTES = 10;

const nudgeSchema = z.object({
  note: z.string().trim().max(140).optional(),
});

/** Colek manual. Dibatesin sekali per 10 menit biar gak jadi alat teror. */
export async function POST(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  if (!ctx.partner) {
    return NextResponse.json({ error: "Pasangan lo belum gabung" }, { status: 409 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { note } = nudgeSchema.parse(body ?? {});

    const since = new Date(Date.now() - NUDGE_COOLDOWN_MINUTES * MINUTE_MS);
    const recent = await prisma.notification.findFirst({
      where: {
        userId: ctx.partner.userId,
        type: "berdua_nudge",
        createdAt: { gt: since },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      const waitMs = recent.createdAt.getTime() + NUDGE_COOLDOWN_MINUTES * MINUTE_MS - Date.now();
      return NextResponse.json(
        {
          error: `Baru aja nyolek. Tunggu ${Math.ceil(waitMs / MINUTE_MS)} menit lagi.`,
          code: "COOLDOWN",
        },
        { status: 429 }
      );
    }

    await notifyNudge({
      pairId: ctx.pair.id,
      recipientId: ctx.partner.userId,
      senderName: displayName(ctx.me),
      note,
    });

    return NextResponse.json({
      success: true,
      partnerInQuietHours: isQuietAt(new Date(), ctx.partner),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Nudge error:", error);
    return NextResponse.json({ error: "Gagal nyolek" }, { status: 500 });
  }
}
