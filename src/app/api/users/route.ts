import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      avatarUrl: true,
      lastActive: true,
      _count: {
        select: {
          forumPosts: true,
          forumReplies: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Transform to add isOnline field
  const usersWithOnline = users.map((u) => ({
    ...u,
    isOnline: u.lastActive
      ? Date.now() - new Date(u.lastActive).getTime() < 120000 // 2 minutes
      : false,
    lastActive: undefined,
  }));

  return NextResponse.json({ users: usersWithOnline });
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get("authorization")?.slice(7);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { verifyToken } = await import("@/lib/auth");
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: any = {};

    if (body.name) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.phone) updateData.phone = body.phone;

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate profil" },
      { status: 500 }
    );
  }
}
