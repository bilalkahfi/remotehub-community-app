import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    const messages = await prisma.globalChatMessage.findMany({
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.globalChatMessage.count();

    return NextResponse.json({
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json({ error: "Gagal mengambil pesan" }, { status: 500 });
  }
}

const sendSchema = z.object({
  content: z.string().min(1, "Pesan tidak boleh kosong").max(2000),
});

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = sendSchema.parse(body);

    const message = await prisma.globalChatMessage.create({
      data: {
        content: data.content,
        authorId: payload.userId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Parse @mentions in the message and create notifications
    const lowerContent = data.content.toLowerCase();
    const hasEveryone = lowerContent.includes('@everyone');
    try {
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true },
      });
      for (const u of allUsers) {
        if (u.id === payload.userId) continue;
        let shouldNotify = false;
        if (hasEveryone) {
          shouldNotify = true;
        } else {
          const patterns = [
            `@${u.name.toLowerCase()}`,
            ...u.name.split(" ").map(w => `@${w.toLowerCase()}`)
          ];
          shouldNotify = patterns.some(p => lowerContent.includes(p));
        }
        if (shouldNotify) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              type: "mention",
              title: hasEveryone ? "@everyone" : "New mention",
              message: hasEveryone
                ? `@${payload.name} sent a message to everyone in chat`
                : `@${payload.name} mentioned you in chat`,
              link: "/chat",
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to create mention notification:", e);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Send chat error:", error);
    return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }

    const message = await prisma.globalChatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: "Pesan tidak ditemukan" }, { status: 404 });
    }

    // Check if user is admin/owner
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });

    const isAdminUser = user && isAdmin(user.role);

    // Allow if author OR admin/owner
    if (message.authorId !== payload.userId && !isAdminUser) {
      return NextResponse.json(
        { error: "Anda tidak berhak menghapus pesan ini" },
        { status: 403 }
      );
    }

    await prisma.globalChatMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ message: "Pesan berhasil dihapus" });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json({ error: "Gagal menghapus pesan" }, { status: 500 });
  }
}
