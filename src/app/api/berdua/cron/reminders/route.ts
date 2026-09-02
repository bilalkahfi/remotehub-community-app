import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders, resyncActivePairs } from "@/lib/berdua/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Tanpa CRON_SECRET endpoint ini ditutup, bukan dibuka bebas.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return new URL(request.url).searchParams.get("secret") === secret;
}

async function run(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Sinkronin dulu biar jadwal yang ketinggalan ikut kebenerin, baru kirim.
    const pairs = await resyncActivePairs();
    const result = await dispatchDueReminders();
    return NextResponse.json({ ok: true, pairs, ...result });
  } catch (error) {
    console.error("Dispatch reminder error:", error);
    return NextResponse.json({ error: "Gagal jalanin reminder" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
