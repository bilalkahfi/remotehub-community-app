import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getAdminFromRequest, isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });
    return NextResponse.json({ materials });
  } catch (error) {
    console.error("Get materials error:", error);
    return NextResponse.json({ error: "Gagal mengambil materi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Hanya admin yang bisa menambah materi" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, fileUrl, fileType, fileName, fileSize } = body;

    if (!title || !fileUrl || !fileType || !fileName) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        title,
        description: description || "",
        fileUrl,
        fileType,
        fileName,
        fileSize: fileSize || 0,
        uploadedBy: admin.userId,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error("Create material error:", error);
    return NextResponse.json({ error: "Gagal menambah materi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Hanya admin yang bisa mengedit materi" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, title, description, fileUrl, fileType, fileName } = body;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (fileType !== undefined) updateData.fileType = fileType;
    if (fileName !== undefined) updateData.fileName = fileName;

    const material = await prisma.material.update({
      where: { id },
      data: updateData,
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ material });
  } catch (error) {
    console.error("Update material error:", error);
    return NextResponse.json({ error: "Gagal mengupdate materi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Hanya admin yang bisa menghapus materi" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ message: "Materi berhasil dihapus" });
  } catch (error) {
    console.error("Delete material error:", error);
    return NextResponse.json({ error: "Gagal menghapus materi" }, { status: 500 });
  }
}
