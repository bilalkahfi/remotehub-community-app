import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";

/**
 * Nandain pesan pasangan udah kebaca + nyatet kapan terakhir buka.
 * Sengaja gak nge-cancel reminder: kebaca bukan berarti kebales.
 */
export async function POST(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  const now = new Date();
  const [updated] = await Promise.all([
    prisma.pairMessage.updateMany({
      where: { pairId: ctx.pair.id, senderId: { not: ctx.userId }, readAt: null },
      data: { readAt: now },
    }),
    prisma.pairMember.update({
      where: { userId: ctx.userId },
      data: { lastSeenAt: now },
    }),
  ]);

  return NextResponse.json({ success: true, marked: updated.count });
}
