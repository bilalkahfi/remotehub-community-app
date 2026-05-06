import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const category = await prisma.forumCategory.findUnique({
      where: { slug: params.slug },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: { categoryId: category.id },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.forumPost.count({
        where: { categoryId: category.id },
      }),
    ]);

    return NextResponse.json({
      category,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get category posts error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil postingan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const category = await prisma.forumCategory.findUnique({
      where: { slug: params.slug },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan" },
        { status: 404 }
      );
    }

    // Delete all posts and replies in this category first
    const posts = await prisma.forumPost.findMany({
      where: { categoryId: category.id },
      select: { id: true },
    });

    const postIds = posts.map((p) => p.id);

    if (postIds.length > 0) {
      await prisma.forumReply.deleteMany({
        where: { postId: { in: postIds } },
      });
      await prisma.forumPost.deleteMany({
        where: { categoryId: category.id },
      });
    }

    await prisma.forumCategory.delete({
      where: { slug: params.slug },
    });

    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}
