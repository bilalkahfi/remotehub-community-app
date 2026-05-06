import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get unique conversations
    const sentMessages = await prisma.message.findMany({
      where: { senderId: payload.userId },
      include: {
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: payload.userId },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build unique conversation list
    const conversationMap = new Map();

    for (const msg of sentMessages) {
      const userId = msg.receiver.id;
      if (!conversationMap.has(userId)) {
        conversationMap.set(userId, {
          user: msg.receiver,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unread: 0,
        });
      }
    }

    for (const msg of receivedMessages) {
      const userId = msg.sender.id;
      const existing = conversationMap.get(userId);
      if (existing) {
        if (msg.createdAt > existing.lastMessageAt) {
          existing.lastMessage = msg.content;
          existing.lastMessageAt = msg.createdAt;
        }
        if (!msg.read) {
          existing.unread = (existing.unread || 0) + 1;
        }
      } else {
        conversationMap.set(userId, {
          user: msg.sender,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unread: msg.read ? 0 : 1,
        });
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil percakapan" },
      { status: 500 }
    );
  }
}
