import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalUsers, totalPosts, totalReplies, totalChatMessages, totalMessages, totalCategories] =
    await Promise.all([
      prisma.user.count(),
      prisma.forumPost.count(),
      prisma.forumReply.count(),
      prisma.globalChatMessage.count(),
      prisma.message.count(),
      prisma.forumCategory.count(),
    ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    stats: {
      totalUsers,
      totalPosts,
      totalReplies,
      totalChatMessages,
      totalMessages,
      totalCategories,
    },
    recentUsers,
    admin: { role: admin.role },
  });
}
