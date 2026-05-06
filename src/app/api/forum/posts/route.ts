import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(200),
  content: z.string().min(10, "Konten minimal 10 karakter"),
  categoryId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const post = await prisma.forumPost.create({
      data: {
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        authorId: payload.userId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Gagal membuat postingan" },
      { status: 500 }
    );
  }
}
