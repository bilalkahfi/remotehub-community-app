/**
 * Uji jalan mesin reminder Berdua tanpa perlu buka browser.
 *
 *   DATABASE_URL="postgresql://..." npx tsx scripts/berdua-selftest.ts
 *
 * Aman dijalanin di database dev: semua data yang dibikin di sini pakai email
 * @berdua-selftest.local dan dihapus lagi di akhir.
 */
import { prisma } from "@/lib/prisma";
import {
  dispatchDueReminders,
  findOutstandingRun,
  syncRemindersFor,
} from "@/lib/berdua/reminders";
import { isQuietAt, localMinuteOfDay, shiftOutOfQuietHours, formatDuration } from "@/lib/berdua/time";

const MIN = 60_000;
const HOUR = 60 * MIN;

// Senin 10 Maret 2026, 09:00 WIB.
const BASE = new Date("2026-03-10T02:00:00.000Z");
const at = (offsetMs: number) => new Date(BASE.getTime() + offsetMs);

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function equalDates(a: Date | null | undefined, b: Date): boolean {
  return Boolean(a) && Math.abs(a!.getTime() - b.getTime()) < 1000;
}

async function main() {
  console.log("\n== Fungsi waktu ==");
  {
    const quiet = { quietStartMinute: 23 * 60, quietEndMinute: 7 * 60, tzOffsetMinutes: 420 };
    // 18:00 UTC = 01:00 WIB -> masih jam tenang.
    check("01:00 WIB kehitung jam tenang", isQuietAt(new Date("2026-03-10T18:00:00Z"), quiet));
    // 05:00 UTC = 12:00 WIB -> bukan jam tenang.
    check("12:00 WIB bukan jam tenang", !isQuietAt(new Date("2026-03-10T05:00:00Z"), quiet));
    check(
      "menit lokal dihitung bener",
      localMinuteOfDay(new Date("2026-03-10T05:30:00Z"), 420) === 12 * 60 + 30
    );
    const shifted = shiftOutOfQuietHours(new Date("2026-03-10T18:00:00Z"), quiet);
    check(
      "jam tenang digeser ke 07:00 WIB",
      shifted.toISOString() === "2026-03-11T00:00:00.000Z",
      shifted.toISOString()
    );
    check(
      "jam tenang mati kalau start == end",
      !isQuietAt(new Date("2026-03-10T18:00:00Z"), {
        quietStartMinute: 0,
        quietEndMinute: 0,
        tzOffsetMinutes: 420,
      })
    );
    check("format durasi", formatDuration(3 * HOUR + 20 * MIN) === "3 jam 20 menit");
  }

  // --- Bikin dua orang + satu ruang -----------------------------------------
  await cleanup();

  const dia = await prisma.user.create({
    data: {
      name: "Dia",
      email: "dia@berdua-selftest.local",
      phone: "0800selftest1",
      passwordHash: "x",
    },
  });
  const gw = await prisma.user.create({
    data: {
      name: "Gw",
      email: "gw@berdua-selftest.local",
      phone: "0800selftest2",
      passwordHash: "x",
    },
  });

  const pair = await prisma.pair.create({
    data: {
      inviteCode: `TEST${Date.now().toString().slice(-6)}`,
      members: {
        create: [
          { userId: dia.id },
          {
            userId: gw.id,
            reminderLadder: [30, 120, 360],
            urgentLadder: [10, 45],
            quietStartMinute: 23 * 60,
            quietEndMinute: 7 * 60,
            tzOffsetMinutes: 420,
          },
        ],
      },
    },
  });

  const send = (
    senderId: string,
    content: string,
    offsetMs: number,
    options: { priority?: string; needsReply?: boolean } = {}
  ) =>
    prisma.pairMessage.create({
      data: {
        pairId: pair.id,
        senderId,
        content,
        createdAt: at(offsetMs),
        priority: options.priority ?? "normal",
        needsReply: options.needsReply ?? true,
      },
    });

  const pendingFor = (userId: string) =>
    prisma.replyReminder.findMany({
      where: { pairId: pair.id, targetUserId: userId, status: "pending" },
      orderBy: { step: "asc" },
    });

  const resetPair = async () => {
    await prisma.replyReminder.deleteMany({ where: { pairId: pair.id } });
    await prisma.pairMessage.deleteMany({ where: { pairId: pair.id } });
    await prisma.notification.deleteMany({ where: { userId: { in: [gw.id, dia.id] } } });
    await prisma.pairMember.updateMany({
      where: { pairId: pair.id },
      data: { snoozedUntil: null },
    });
  };

  console.log("\n== Penjadwalan ==");
  {
    await send(dia.id, "lagi apa?", 0);
    await syncRemindersFor(pair.id, gw.id);

    const pending = await pendingFor(gw.id);
    check("3 tingkat reminder kejadwal", pending.length === 3, `dapet ${pending.length}`);
    check("tingkat 1 = +30 menit", equalDates(pending[0]?.dueAt, at(30 * MIN)));
    check("tingkat 2 = +2 jam", equalDates(pending[1]?.dueAt, at(2 * HOUR)));
    check("tingkat 3 = +6 jam", equalDates(pending[2]?.dueAt, at(6 * HOUR)));
    check("yang ngirim gak ikut diingetin", (await pendingFor(dia.id)).length === 0);
  }

  console.log("\n== Pesan beruntun gak nge-reset hitungan ==");
  {
    await send(dia.id, "halo?", 10 * MIN);
    await send(dia.id, "kok diem", 20 * MIN);
    await syncRemindersFor(pair.id, gw.id);

    const pending = await pendingFor(gw.id);
    check("jadwal tetep dari pesan pertama", equalDates(pending[0]?.dueAt, at(30 * MIN)));

    const run = await findOutstandingRun(pair.id, gw.id);
    check("3 pesan kehitung nyantol", run?.count === 3, `count=${run?.count}`);
    check("jangkar = pesan pertama", run?.anchor.content === "lagi apa?");
  }

  console.log("\n== Pengiriman ==");
  {
    const result = await dispatchDueReminders(at(31 * MIN));
    check("tingkat 1 kekirim", result.sent === 1, JSON.stringify(result));

    const notif = await prisma.notification.findFirst({
      where: { userId: gw.id, type: "berdua_reminder" },
      orderBy: { createdAt: "desc" },
    });
    check("notifikasi masuk buat yang belum bales", Boolean(notif));
    check(
      "isinya nyebut lama nunggu",
      Boolean(notif?.message?.includes("31 menit")),
      notif?.message
    );
    check("sisa 2 tingkat pending", (await pendingFor(gw.id)).length === 2);
  }

  console.log("\n== Beberapa tingkat jatuh tempo bareng ==");
  {
    const result = await dispatchDueReminders(at(7 * HOUR));
    check("cuma satu notif dikirim", result.sent === 1, JSON.stringify(result));
    check("tingkat bawahnya dilewat, bukan dispam", result.skipped === 1);
    check("gak ada sisa pending", (await pendingFor(gw.id)).length === 0);
  }

  console.log("\n== Dibales = reminder batal ==");
  {
    await resetPair();
    await send(dia.id, "besok jadi?", 0);
    await syncRemindersFor(pair.id, gw.id);
    check("ada jadwal dulu", (await pendingFor(gw.id)).length === 3);

    await send(gw.id, "jadi dong", 15 * MIN);
    await syncRemindersFor(pair.id, gw.id);
    check("jadwal gw kehapus setelah bales", (await pendingFor(gw.id)).length === 0);

    await syncRemindersFor(pair.id, dia.id);
    const diaPending = await pendingFor(dia.id);
    check("giliran dia yang punya utang balasan", diaPending.length > 0);
    check(
      "hitungannya mulai dari balasan tadi",
      equalDates(diaPending[0]?.dueAt, at(15 * MIN + 30 * MIN))
    );
  }

  console.log("\n== Dibaca doang gak ngebatalin ==");
  {
    await resetPair();
    await send(dia.id, "bales dong", 0);
    await syncRemindersFor(pair.id, gw.id);
    await prisma.pairMessage.updateMany({
      where: { pairId: pair.id, senderId: dia.id },
      data: { readAt: at(5 * MIN) },
    });
    await syncRemindersFor(pair.id, gw.id);
    check("kebaca tapi belum kebales tetep diingetin", (await pendingFor(gw.id)).length === 3);
  }

  console.log("\n== Jam tenang ==");
  {
    await resetPair();
    // 15:50 UTC = 22:50 WIB. Tingkat pertama (+30 mnt) jatuh 23:20 -> jam tenang.
    const malam = new Date("2026-03-10T15:50:00.000Z").getTime() - BASE.getTime();
    await send(dia.id, "udah tidur?", malam);
    await syncRemindersFor(pair.id, gw.id);

    const pending = await pendingFor(gw.id);
    check(
      "reminder tengah malam digeser ke 07:00 WIB",
      pending[0]?.dueAt.toISOString() === "2026-03-11T00:00:00.000Z",
      pending[0]?.dueAt.toISOString()
    );

    const result = await dispatchDueReminders(new Date("2026-03-10T17:00:00.000Z"));
    check("gak ada yang dikirim pas jam tenang", result.sent === 0, JSON.stringify(result));
  }

  console.log("\n== Pesan penting pakai tangga lebih rapat ==");
  {
    await resetPair();
    await send(dia.id, "ini penting", 0, { priority: "urgent" });
    await syncRemindersFor(pair.id, gw.id);

    const pending = await pendingFor(gw.id);
    check("pakai tangga urgent (2 tingkat)", pending.length === 2, `dapet ${pending.length}`);
    check("tingkat 1 = +10 menit", equalDates(pending[0]?.dueAt, at(10 * MIN)));
  }

  console.log("\n== 'Gak usah dibales' ==");
  {
    await resetPair();
    await send(dia.id, "otw ya, gausah dibales", 0, { needsReply: false });
    await syncRemindersFor(pair.id, gw.id);
    check("gak ada reminder sama sekali", (await pendingFor(gw.id)).length === 0);

    await send(dia.id, "eh tapi ini dibales dong", 5 * MIN);
    await syncRemindersFor(pair.id, gw.id);
    const pending = await pendingFor(gw.id);
    check("jangkar lompat ke pesan yang butuh balasan", equalDates(pending[0]?.dueAt, at(35 * MIN)));
  }

  console.log("\n== Snooze ==");
  {
    await resetPair();
    await send(dia.id, "hoi", 0);
    await syncRemindersFor(pair.id, gw.id);

    const snoozedUntil = at(4 * HOUR);
    await prisma.pairMember.update({ where: { userId: gw.id }, data: { snoozedUntil } });
    await syncRemindersFor(pair.id, gw.id);

    const pending = await pendingFor(gw.id);
    check("jadwal mundur ke akhir snooze", equalDates(pending[0]?.dueAt, snoozedUntil));

    const result = await dispatchDueReminders(at(2 * HOUR));
    check("dispatcher nahan selama snooze", result.sent === 0, JSON.stringify(result));
  }

  console.log("\n== Reminder dimatiin ==");
  {
    await resetPair();
    await prisma.pairMember.update({
      where: { userId: gw.id },
      data: { remindersEnabled: false, snoozedUntil: null },
    });
    await send(dia.id, "tes", 0);
    await syncRemindersFor(pair.id, gw.id);
    check("gak ada jadwal pas reminder off", (await pendingFor(gw.id)).length === 0);
  }

  await cleanup();

  console.log(`\n${failed === 0 ? "SEMUA LOLOS" : "ADA YANG GAGAL"}: ${passed} lolos, ${failed} gagal\n`);
  if (failed > 0) process.exitCode = 1;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@berdua-selftest.local" } },
    select: { id: true },
  });
  if (users.length === 0) return;

  const ids = users.map((u) => u.id);
  const members = await prisma.pairMember.findMany({
    where: { userId: { in: ids } },
    select: { pairId: true },
  });

  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.pair.deleteMany({
    where: { id: { in: members.map((m) => m.pairId) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
