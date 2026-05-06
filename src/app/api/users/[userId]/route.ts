import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        role: true,
        lastActive: true,
        _count: {
          select: {
            forumPosts: true,
            forumReplies: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userWithOnline = {
      ...user,
      isOnline: user.lastActive
        ? Date.now() - new Date(user.lastActive).getTime() < 120000
        : false,
      lastActive: undefined,
    };
    return NextResponse.json({ user: userWithOnline });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
