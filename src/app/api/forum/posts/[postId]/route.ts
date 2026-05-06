import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest, isAdmin } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id: params.postId },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Postingan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil postingan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const post = await prisma.forumPost.findUnique({
      where: { id: params.postId },
    });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.pinned !== undefined) updateData.pinned = body.pinned;
    if (body.locked !== undefined) updateData.locked = body.locked;

    const updated = await prisma.forumPost.update({
      where: { id: params.postId },
      data: updateData,
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Patch post error:", error);
    return NextResponse.json({ error: "Gagal update postingan" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { getUserFromRequest } = await import("@/lib/auth");
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin/owner
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });
  const isAdminUser = user && isAdmin(user.role);

  try {
    const post = await prisma.forumPost.findUnique({
      where: { id: params.postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Postingan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Allow if author OR admin/owner
    if (post.authorId !== payload.userId && !isAdminUser) {
      return NextResponse.json(
        { error: "Anda tidak berhak menghapus postingan ini" },
        { status: 403 }
      );
    }

    // Delete replies first
    await prisma.forumReply.deleteMany({
      where: { postId: params.postId },
    });
    await prisma.forumPost.delete({
      where: { id: params.postId },
    });

    return NextResponse.json({ message: "Postingan berhasil dihapus" });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus postingan" },
      { status: 500 }
    );
  }
}
