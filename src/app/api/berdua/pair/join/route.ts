import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/berdua/guard";
import { getPairContext, normalizeInviteCode } from "@/lib/berdua/pair";

const joinSchema = z.object({ code: z.string().min(4).max(16) });

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { code } = joinSchema.parse(await request.json());

    const existing = await getPairContext(auth.data.userId);
    if (existing) {
      return NextResponse.json(
        { error: "Lo udah gabung di satu ruang", code: "ALREADY_PAIRED" },
        { status: 409 }
      );
    }

    const pair = await prisma.pair.findUnique({
      where: { inviteCode: normalizeInviteCode(code) },
      include: { members: true },
    });
    if (!pair) {
      return NextResponse.json({ error: "Kode undangan gak ketemu" }, { status: 404 });
    }
    if (pair.members.length >= 2) {
      return NextResponse.json(
        { error: "Ruang ini udah berisi dua orang" },
        { status: 409 }
      );
    }

    await prisma.pairMember.create({
      data: { pairId: pair.id, userId: auth.data.userId },
    });

    // Kode dibuang setelah kepakai biar gak ada orang ketiga yang nyoba-nyoba.
    await prisma.pair.update({
      where: { id: pair.id },
      data: { inviteCode: `used-${pair.id}` },
    });

    return NextResponse.json({ success: true, pairId: pair.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Kode undangan gak valid" }, { status: 400 });
    }
    console.error("Join pair error:", error);
    return NextResponse.json({ error: "Gagal gabung ke ruang" }, { status: 500 });
  }
}
