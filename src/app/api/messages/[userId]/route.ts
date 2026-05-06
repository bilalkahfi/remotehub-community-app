import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: payload.userId, receiverId: params.userId },
          { senderId: params.userId, receiverId: payload.userId },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        senderId: params.userId,
        receiverId: payload.userId,
        read: false,
      },
      data: { read: true },
    });

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: payload.userId, receiverId: params.userId },
          { senderId: params.userId, receiverId: payload.userId },
        ],
      },
    });

    return NextResponse.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil pesan" },
      { status: 500 }
    );
  }
}

const sendSchema = z.object({
  content: z.string().min(1, "Pesan tidak boleh kosong"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = sendSchema.parse(body);

    const message = await prisma.message.create({
      data: {
        content: data.content,
        senderId: payload.userId,
        receiverId: params.userId,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Create notification for the receiver
    try {
      await prisma.notification.create({
        data: {
          userId: params.userId,
          type: "dm",
          title: "New message",
          message: `${payload.name}: ${data.content.slice(0, 100)}`,
          link: `/messages/${payload.userId}`,
        },
      });
    } catch (e) {
      console.error("Failed to create DM notification:", e);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim pesan" },
      { status: 500 }
    );
  }
}
