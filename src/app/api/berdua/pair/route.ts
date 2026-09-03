import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/berdua/guard";
import { createUniqueInviteCode, getPairContext } from "@/lib/berdua/pair";
import { getVapidPublicKey, isPushConfigured } from "@/lib/berdua/push";

function serialize(ctx: NonNullable<Awaited<ReturnType<typeof getPairContext>>>) {
  return {
    pair: { id: ctx.pair.id, inviteCode: ctx.pair.inviteCode, createdAt: ctx.pair.createdAt },
    me: {
      userId: ctx.me.userId,
      name: ctx.me.user.name,
      nickname: ctx.me.nickname,
      avatarUrl: ctx.me.user.avatarUrl,
    },
    partner: ctx.partner
      ? {
          userId: ctx.partner.userId,
          name: ctx.partner.user.name,
          nickname: ctx.partner.nickname,
          avatarUrl: ctx.partner.user.avatarUrl,
          lastSeenAt: ctx.partner.lastSeenAt,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const ctx = await getPairContext(auth.data.userId);
  return NextResponse.json({
    paired: Boolean(ctx),
    ...(ctx ? serialize(ctx) : {}),
    push: { configured: isPushConfigured(), publicKey: getVapidPublicKey() },
  });
}

/** Bikin ruang baru. Yang bikin dapet kode undangan buat dikasih ke pasangan. */
export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const existing = await getPairContext(auth.data.userId);
  if (existing) {
    return NextResponse.json(
      { error: "Lo udah punya ruang berdua", code: "ALREADY_PAIRED" },
      { status: 409 }
    );
  }

  const inviteCode = await createUniqueInviteCode();
  await prisma.pair.create({
    data: {
      inviteCode,
      members: { create: { userId: auth.data.userId } },
    },
  });

  const ctx = await getPairContext(auth.data.userId);
  return NextResponse.json(ctx ? serialize(ctx) : {}, { status: 201 });
}

/** Keluar dari ruang. Kalau ruangnya jadi kosong, semua isinya ikut kehapus. */
export async function DELETE(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const ctx = await getPairContext(auth.data.userId);
  if (!ctx) return NextResponse.json({ error: "Belum punya pasangan" }, { status: 404 });

  await prisma.pairMember.delete({ where: { userId: auth.data.userId } });

  const remaining = await prisma.pairMember.count({ where: { pairId: ctx.pair.id } });
  if (remaining === 0) {
    await prisma.pair.delete({ where: { id: ctx.pair.id } });
  }

  return NextResponse.json({ success: true, pairDeleted: remaining === 0 });
}
