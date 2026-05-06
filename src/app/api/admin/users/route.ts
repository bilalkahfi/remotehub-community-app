import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/admin";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

const warnSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1, "Alasan peringatan wajib diisi").max(500),
});

const banSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1, "Alasan ban wajib diisi").max(500),
});

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const users = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
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
        role: true,
        warnedAt: true,
        warnedReason: true,
        bannedAt: true,
        bannedReason: true,
        lastActive: true,
        createdAt: true,
        _count: {
          select: {
            forumPosts: true,
            forumReplies: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-revoke expired warnings (7 days) and update in DB
    const now = new Date();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const u of users) {
      if (u.warnedAt && !u.bannedAt && (now.getTime() - new Date(u.warnedAt).getTime() > sevenDaysMs)) {
        await prisma.user.update({
          where: { id: u.id },
          data: { warnedAt: null, warnedReason: null },
        });
      }
    }

    const usersWithOnline = users.map((u) => {
      const warnExpired = u.warnedAt && !u.bannedAt
        ? now.getTime() - new Date(u.warnedAt).getTime() > sevenDaysMs
        : false;
      return {
        ...u,
        isOnline: u.lastActive
          ? Date.now() - new Date(u.lastActive).getTime() < 120000
          : false,
        warnExpired,
        lastActive: undefined,
      };
    });

    return NextResponse.json({ users: usersWithOnline });
  } catch (error) {
    console.error("Admin get users error:", error);
    return NextResponse.json({ error: "Gagal mengambil data users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Revoke warning
    if (body.revokeWarn) {
      const targetUser = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { role: true },
      });

      if (!targetUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      if (targetUser.role === "owner") {
        return NextResponse.json({ error: "Tidak bisa revoke warning owner" }, { status: 403 });
      }

      const updated = await prisma.user.update({
        where: { id: body.userId },
        data: { warnedAt: null, warnedReason: null },
        select: { id: true, name: true, email: true, warnedAt: true, warnedReason: true },
      });

      return NextResponse.json({ user: updated });
    }

    // Update role (owner only)
    if (admin.role !== "owner") {
      return NextResponse.json({ error: "Hanya owner yang bisa mengubah role" }, { status: 403 });
    }

    const data = updateRoleSchema.parse(body);
    const targetUser = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true } });
    if (!targetUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (targetUser.role === "owner") {
      return NextResponse.json({ error: "Tidak bisa mengubah role owner" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Admin update error:", error);
    return NextResponse.json({ error: "Gagal mengupdate" }, { status: 500 });
  }
}

// Warn user (POST)
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = warnSchema.parse(body);

    const targetUser = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true } });
    if (!targetUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    if (targetUser.role === "owner") {
      return NextResponse.json({ error: "Tidak bisa memberi peringatan ke owner" }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { warnedAt: new Date(), warnedReason: data.reason },
      select: { id: true, name: true, email: true, warnedAt: true, warnedReason: true },
    });

    // Notification
    try {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: "warning",
          title: "⚠️ Anda mendapat peringatan",
          message: `Alasan: ${data.reason}. Peringatan berlaku 7 hari.`,
          link: "/members/" + data.userId,
        },
      });
    } catch (e) { console.error("Failed to create warning notification:", e); }

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error("Admin warn error:", error);
    return NextResponse.json({ error: "Gagal memberi peringatan" }, { status: 500 });
  }
}

// Ban / Unban user (PUT)
export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "ban") {
      const data = banSchema.parse(body);
      const targetUser = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true } });
      if (!targetUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      if (targetUser.role === "owner") return NextResponse.json({ error: "Tidak bisa ban owner" }, { status: 403 });

      const updated = await prisma.user.update({
        where: { id: data.userId },
        data: { bannedAt: new Date(), bannedReason: data.reason },
        select: { id: true, name: true, email: true, bannedAt: true, bannedReason: true },
      });

      return NextResponse.json({ user: updated });
    }

    if (body.action === "unban") {
      const targetUser = await prisma.user.findUnique({ where: { id: body.userId }, select: { role: true } });
      if (!targetUser) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

      const updated = await prisma.user.update({
        where: { id: body.userId },
        data: { bannedAt: null, bannedReason: null, warnedAt: null, warnedReason: null },
        select: { id: true, name: true, email: true, bannedAt: true, bannedReason: true },
      });

      return NextResponse.json({ user: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error("Admin ban/unban error:", error);
    return NextResponse.json({ error: "Gagal memproses" }, { status: 500 });
  }
}
