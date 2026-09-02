import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/berdua/guard";
import { getVapidPublicKey, isPushConfigured } from "@/lib/berdua/push";

export async function GET(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const devices = await prisma.pushSubscription.count({
    where: { userId: auth.data.userId },
  });

  return NextResponse.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
    devices,
  });
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  try {
    const data = subscribeSchema.parse(await request.json());

    // Endpoint bisa pindah tangan kalau HP-nya dipakai akun lain.
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId: auth.data.userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,
      },
      update: {
        userId: auth.data.userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        failureCount: 0,
        userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,
      },
    });

    return NextResponse.json({ success: true, id: subscription.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Data langganan push gak valid" }, { status: 400 });
    }
    console.error("Subscribe push error:", error);
    return NextResponse.json({ error: "Gagal daftarin notifikasi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint wajib diisi" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: auth.data.userId },
  });

  return NextResponse.json({ success: true });
}
