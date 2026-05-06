import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1, "Balasan tidak boleh kosong"),
  postId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const reply = await prisma.forumReply.create({
      data: {
        content: data.content,
        postId: data.postId,
        authorId: payload.userId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create reply error:", error);
    return NextResponse.json(
      { error: "Gagal membalas" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const replyId = searchParams.get("id");

    if (!replyId) {
      return NextResponse.json({ error: "Reply ID required" }, { status: 400 });
    }

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      return NextResponse.json({ error: "Balasan tidak ditemukan" }, { status: 404 });
    }

    // Check if user is admin/owner
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });

    const isAdminUser = user && isAdmin(user.role);

    // Allow if author OR admin/owner
    if (reply.authorId !== payload.userId && !isAdminUser) {
      return NextResponse.json(
        { error: "Anda tidak berhak menghapus balasan ini" },
        { status: 403 }
      );
    }

    await prisma.forumReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json({ message: "Balasan berhasil dihapus" });
  } catch (error) {
    console.error("Delete reply error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus balasan" },
      { status: 500 }
    );
  }
}
