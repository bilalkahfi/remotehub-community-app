import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const room = await prisma.voiceRoom.findUnique({
      where: { id: params.roomId },
      include: {
        creator: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Get voice room error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil voice room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const room = await prisma.voiceRoom.findUnique({
      where: { id: params.roomId },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room tidak ditemukan" },
        { status: 404 }
      );
    }

    if (room.createdBy !== payload.userId) {
      return NextResponse.json(
        { error: "Hanya pembuat room yang bisa menghapus" },
        { status: 403 }
      );
    }

    await prisma.voiceRoom.delete({
      where: { id: params.roomId },
    });

    return NextResponse.json({ message: "Room berhasil dihapus" });
  } catch (error) {
    console.error("Delete voice room error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus voice room" },
      { status: 500 }
    );
  }
}
