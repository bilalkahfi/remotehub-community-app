import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { createUniqueInviteCode } from "@/lib/berdua/pair";

/** Bikin kode undangan baru, misalnya kalau kode lama kesebar. */
export async function POST(request: NextRequest) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  if (ctx.partner) {
    return NextResponse.json(
      { error: "Ruang udah berisi dua orang, kode undangan gak dibutuhin lagi" },
      { status: 409 }
    );
  }

  const inviteCode = await createUniqueInviteCode();
  await prisma.pair.update({ where: { id: ctx.pair.id }, data: { inviteCode } });

  return NextResponse.json({ inviteCode });
}
