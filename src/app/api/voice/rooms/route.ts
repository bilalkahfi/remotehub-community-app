import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    const rooms = await prisma.voiceRoom.findMany({
      where: { isActive: true },
      include: {
        creator: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Get voice rooms error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil voice room" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(3, "Nama room minimal 3 karakter"),
});

export async function POST(request: NextRequest) {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const room = await prisma.voiceRoom.create({
      data: {
        name: data.name,
        createdBy: payload.userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create voice room error:", error);
    return NextResponse.json(
      { error: "Gagal membuat voice room" },
      { status: 500 }
    );
  }
}
