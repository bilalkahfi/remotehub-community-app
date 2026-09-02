import { prisma } from "@/lib/prisma";
import type { Pair, PairMember, User } from "@prisma/client";

export type MemberWithUser = PairMember & {
  user: Pick<User, "id" | "name" | "avatarUrl">;
};

export interface PairContext {
  pair: Pair;
  me: MemberWithUser;
  partner: MemberWithUser | null;
}

// Tanpa 0/O/1/I biar gampang dibacain lewat telepon.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const taken = await prisma.pair.findUnique({ where: { inviteCode: code } });
    if (!taken) return code;
  }
  // Praktis mustahil, tapi lebih baik panjangin kode daripada gagal.
  return generateInviteCode(10);
}

const memberSelect = {
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function getPairContext(userId: string): Promise<PairContext | null> {
  const membership = await prisma.pairMember.findUnique({
    where: { userId },
    include: {
      ...memberSelect,
      pair: { include: { members: { include: memberSelect } } },
    },
  });
  if (!membership) return null;

  const { pair, ...me } = membership;
  const partner = pair.members.find((m) => m.userId !== userId) ?? null;

  return {
    pair: { id: pair.id, inviteCode: pair.inviteCode, createdAt: pair.createdAt },
    me: me as MemberWithUser,
    partner: partner as MemberWithUser | null,
  };
}

export function displayName(member: MemberWithUser | null): string {
  if (!member) return "dia";
  return member.nickname?.trim() || member.user.name;
}
