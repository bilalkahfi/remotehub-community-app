import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/berdua/guard";
import { isPushConfigured, sendPushToUser } from "@/lib/berdua/push";

export async function POST(request: NextRequest) {
  const auth = requireUser(request);
  if (auth.response) return auth.response;

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "VAPID key belum diset di server" },
      { status: 503 }
    );
  }

  const result = await sendPushToUser(auth.data.userId, {
    title: "Tes notifikasi Berdua",
    body: "Kalau ini muncul di layar kunci, reminder-nya bakal jalan.",
    tag: "berdua-test",
    url: "/berdua",
  });

  return NextResponse.json(result);
}
