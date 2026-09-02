"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, BerduaApiError, formatDurationMs } from "@/lib/berdua/client";
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  isIOS,
  isPushSupported,
  isStandalone,
} from "@/lib/berdua/pushClient";

interface Settings {
  nickname: string | null;
  remindersEnabled: boolean;
  reminderLadder: number[];
  urgentLadder: number[];
  quietStartMinute: number;
  quietEndMinute: number;
  tzOffsetMinutes: number;
}

interface StatusPayload {
  stats: {
    windowDays: number;
    messages: number;
    perUser: {
      userId: string;
      replies: number;
      avgReplyMs: number | null;
      medianReplyMs: number | null;
      slowestReplyMs: number | null;
    }[];
  };
}

interface PairPayload {
  me?: { userId: string; name: string };
  partner?: { userId: string; name: string; nickname: string | null } | null;
  push: { configured: boolean; publicKey: string | null };
}

const LADDER_PRESETS: { label: string; hint: string; value: number[] }[] = [
  { label: "Santai", hint: "1 jam · 4 jam · 12 jam", value: [60, 240, 720] },
  { label: "Standar", hint: "30 mnt · 2 jam · 6 jam · 1 hari", value: [30, 120, 360, 1440] },
  { label: "Rajin", hint: "15 mnt · 1 jam · 3 jam · 8 jam", value: [15, 60, 180, 480] },
];

const TIMEZONES = [
  { label: "WIB (UTC+7)", value: 420 },
  { label: "WITA (UTC+8)", value: 480 },
  { label: "WIT (UTC+9)", value: 540 },
];

function minuteToTimeValue(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function timeValueToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function ladderToText(ladder: number[]): string {
  return ladder.join(", ");
}

export default function BerduaPengaturanPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pair, setPair] = useState<PairPayload | null>(null);
  const [stats, setStats] = useState<StatusPayload["stats"] | null>(null);
  const [ladderText, setLadderText] = useState("");
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settingsRes, pairRes, statusRes] = await Promise.all([
        api<{ settings: Settings }>("/api/berdua/settings"),
        api<PairPayload>("/api/berdua/pair"),
        api<StatusPayload>("/api/berdua/status"),
      ]);
      setSettings(settingsRes.settings);
      setLadderText(ladderToText(settingsRes.settings.reminderLadder));
      setPair(pairRes);
      setStats(statusRes.stats);
      setPushOn(Boolean(await getExistingSubscription()));
    } catch (err) {
      if (err instanceof BerduaApiError && err.status === 401) {
        router.replace("/berdua/masuk");
        return;
      }
      if (err instanceof BerduaApiError && err.code === "NO_PAIR") {
        router.replace("/berdua/setup");
        return;
      }
      setNote((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    try {
      const res = await api<{ settings: Settings }>("/api/berdua/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(res.settings);
      setLadderText(ladderToText(res.settings.reminderLadder));
      setNote("Kesimpen ✓");
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveCustomLadder = () => {
    const parsed = ladderText
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (parsed.length === 0) {
      setNote("Isi minimal satu angka menit, contoh: 30, 120, 360");
      return;
    }
    save({ reminderLadder: parsed });
  };

  const togglePush = async () => {
    if (pushOn) {
      await disablePush();
      setPushOn(false);
      setNote("Notifikasi dimatiin di HP ini.");
      return;
    }
    const result = await enablePush(pair?.push.publicKey ?? null);
    setPushOn(result.ok);
    setNote(
      result.ok
        ? "Notifikasi nyala."
        : result.reason === "needs-install"
          ? "Di iPhone: Share → Add to Home Screen dulu."
          : "Gagal nyalain notifikasi."
    );
  };

  const testPush = async () => {
    try {
      const res = await api<{ sent: number }>("/api/berdua/push/test", { method: "POST" });
      setNote(res.sent > 0 ? `Tes kekirim ke ${res.sent} device.` : "Belum ada device terdaftar.");
    } catch (err) {
      setNote((err as Error).message);
    }
  };

  const leavePair = async () => {
    if (!window.confirm("Keluar dari ruang ini? Kalau dua-duanya keluar, semua chat kehapus.")) {
      return;
    }
    try {
      await api("/api/berdua/pair", { method: "DELETE" });
      router.replace("/berdua/setup");
    } catch (err) {
      setNote((err as Error).message);
    }
  };

  if (!settings) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e0457b] border-t-transparent" />
      </main>
    );
  }

  const myStats = stats?.perUser.find((s) => s.userId === pair?.me?.userId);
  const partnerStats = stats?.perUser.find((s) => s.userId === pair?.partner?.userId);
  const partnerLabel = pair?.partner?.nickname || pair?.partner?.name || "Dia";

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-lg px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/berdua" className="rounded-lg p-2 text-[#a99cc0] hover:bg-white/5">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">Pengaturan</h1>
      </div>

      {note && (
        <button
          type="button"
          onClick={() => setNote(null)}
          className="mb-4 w-full rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-[#c9bde0]"
        >
          {note}
        </button>
      )}

      <Section title="Notifikasi">
        {isIOS() && !isStandalone() && (
          <p className="mb-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            Di iPhone, notifikasi baru bisa nyala kalau app-nya dibuka dari Home Screen
            (Share → Add to Home Screen).
          </p>
        )}
        {!pair?.push.configured && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200">
            Server belum diisi VAPID key, jadi push belum bisa dikirim.
          </p>
        )}
        <Row
          label="Push di HP ini"
          hint={isPushSupported() ? undefined : "Browser ini gak dukung push"}
          action={
            <Toggle checked={Boolean(pushOn)} onChange={togglePush} disabled={!isPushSupported()} />
          }
        />
        <button
          type="button"
          onClick={testPush}
          className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-sm transition hover:bg-white/5"
        >
          Kirim notifikasi tes
        </button>
      </Section>

      <Section title="Reminder balasan">
        <Row
          label="Ingetin kalau gw belum bales"
          action={
            <Toggle
              checked={settings.remindersEnabled}
              onChange={() => save({ remindersEnabled: !settings.remindersEnabled })}
            />
          }
        />

        <p className="mb-2 mt-4 text-xs text-[#a99cc0]">
          Jaraknya dihitung dari pesan pertama yang belum kebales.
        </p>
        <div className="space-y-2">
          {LADDER_PRESETS.map((preset) => {
            const active = ladderToText(settings.reminderLadder) === ladderToText(preset.value);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => save({ reminderLadder: preset.value })}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                  active ? "border-[#e0457b] bg-[#e0457b]/15" : "border-white/10 hover:bg-white/5"
                }`}
              >
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-xs text-[#a99cc0]">{preset.hint}</span>
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-[#a99cc0]">
            Atur sendiri (menit, pisah pakai koma)
          </span>
          <div className="flex gap-2">
            <input
              value={ladderText}
              onChange={(e) => setLadderText(e.target.value)}
              placeholder="30, 120, 360"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-[#e0457b]"
            />
            <button
              type="button"
              onClick={saveCustomLadder}
              disabled={saving}
              className="rounded-xl bg-[#e0457b] px-4 text-sm font-semibold disabled:opacity-50"
            >
              Simpan
            </button>
          </div>
        </label>
      </Section>

      <Section title="Jam tenang">
        <p className="mb-3 text-xs text-[#a99cc0]">
          Reminder yang jatuh di rentang ini ditunda sampai jam tenang selesai. Pesan masuk
          biasa tetap lewat.
        </p>
        <div className="flex items-center gap-3">
          <TimeInput
            label="Mulai"
            value={minuteToTimeValue(settings.quietStartMinute)}
            onChange={(value) => {
              const minute = timeValueToMinute(value);
              if (minute !== null) save({ quietStartMinute: minute });
            }}
          />
          <TimeInput
            label="Sampai"
            value={minuteToTimeValue(settings.quietEndMinute)}
            onChange={(value) => {
              const minute = timeValueToMinute(value);
              if (minute !== null) save({ quietEndMinute: minute });
            }}
          />
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-[#a99cc0]">Zona waktu</span>
          <select
            value={settings.tzOffsetMinutes}
            onChange={(e) => save({ tzOffsetMinutes: Number(e.target.value) })}
            className="w-full rounded-xl border border-white/10 bg-[#1a1226] px-3 py-2.5 text-sm outline-none focus:border-[#e0457b]"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </label>
      </Section>

      {stats && (
        <Section title={`Rekap ${stats.windowDays} hari`}>
          <p className="mb-3 text-xs text-[#a99cc0]">{stats.messages} pesan.</p>
          <StatRow label="Lo" stat={myStats} />
          <StatRow label={partnerLabel} stat={partnerStats} />
        </Section>
      )}

      <Section title="Panggilan">
        <label className="block">
          <span className="mb-1 block text-xs text-[#a99cc0]">
            Panggil {partnerLabel} dengan nama lain di reminder lo
          </span>
          <input
            defaultValue={settings.nickname ?? ""}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (settings.nickname ?? "")) {
                save({ nickname: value || null });
              }
            }}
            placeholder="Kosongin buat pakai nama aslinya"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-[#e0457b]"
          />
        </label>
      </Section>

      <div className="mt-8 space-y-2">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            router.replace("/berdua/masuk");
          }}
          className="w-full rounded-xl border border-white/10 py-2.5 text-sm transition hover:bg-white/5"
        >
          Keluar akun
        </button>
        <button
          type="button"
          onClick={leavePair}
          className="w-full rounded-xl border border-red-500/30 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
        >
          Keluar dari ruang berdua
        </button>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a99cc0]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  action,
}: {
  label: string;
  hint?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-[#6f6485]">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`h-6 w-11 flex-shrink-0 rounded-full p-0.5 transition disabled:opacity-40 ${
        checked ? "bg-[#e0457b]" : "bg-white/15"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white transition ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs text-[#a99cc0]">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-[#e0457b]"
      />
    </label>
  );
}

function StatRow({
  label,
  stat,
}: {
  label: string;
  stat?: { replies: number; medianReplyMs: number | null; slowestReplyMs: number | null };
}) {
  return (
    <div className="flex items-baseline justify-between border-t border-white/5 py-2 first:border-t-0">
      <span className="text-sm">{label}</span>
      <span className="text-right text-xs text-[#a99cc0]">
        {stat && stat.replies > 0 ? (
          <>
            biasanya bales {formatDurationMs(stat.medianReplyMs ?? 0)}
            <br />
            <span className="text-[#6f6485]">
              terlama {formatDurationMs(stat.slowestReplyMs ?? 0)} · {stat.replies} balasan
            </span>
          </>
        ) : (
          "belum ada data"
        )}
      </span>
    </div>
  );
}
