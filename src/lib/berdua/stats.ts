import { prisma } from "@/lib/prisma";

export interface UserReplyStats {
  userId: string;
  replies: number;
  avgReplyMs: number | null;
  medianReplyMs: number | null;
  slowestReplyMs: number | null;
}

export interface PairStats {
  windowDays: number;
  messages: number;
  perUser: UserReplyStats[];
}

function summarize(userId: string, samples: number[]): UserReplyStats {
  if (samples.length === 0) {
    return { userId, replies: 0, avgReplyMs: null, medianReplyMs: null, slowestReplyMs: null };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    userId,
    replies: sorted.length,
    avgReplyMs: Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length),
    medianReplyMs:
      sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
    slowestReplyMs: sorted[sorted.length - 1],
  };
}

/**
 * Waktu balas dihitung per "giliran": dari pesan pertama seseorang
 * sampai lawan bicaranya buka suara lagi.
 */
export async function computePairStats(
  pairId: string,
  memberIds: string[],
  windowDays = 14
): Promise<PairStats> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const messages = await prisma.pairMessage.findMany({
    where: { pairId, createdAt: { gte: since } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { senderId: true, createdAt: true },
  });

  const samples = new Map<string, number[]>();
  memberIds.forEach((id) => samples.set(id, []));

  let runSender: string | null = null;
  let runStartedAt: Date | null = null;

  for (const message of messages) {
    if (runSender === null || runSender === message.senderId) {
      if (runSender === null) {
        runSender = message.senderId;
        runStartedAt = message.createdAt;
      }
      continue;
    }
    // Giliran berganti: ini balasan atas rentetan sebelumnya.
    if (runStartedAt) {
      const bucket = samples.get(message.senderId);
      if (bucket) bucket.push(message.createdAt.getTime() - runStartedAt.getTime());
    }
    runSender = message.senderId;
    runStartedAt = message.createdAt;
  }

  return {
    windowDays,
    messages: messages.length,
    perUser: memberIds.map((id) => summarize(id, samples.get(id) ?? [])),
  };
}
