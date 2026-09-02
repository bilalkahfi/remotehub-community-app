"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  BerduaApiError,
  formatClock,
  formatDayLabel,
  formatDurationMs,
} from "@/lib/berdua/client";
import {
  enablePush,
  getExistingSubscription,
  isIOS,
  isPushSupported,
  isStandalone,
  registerServiceWorker,
} from "@/lib/berdua/pushClient";

interface Message {
  id: string;
  senderId: string;
  content: string;
  priority: "normal" | "urgent" | string;
  needsReply: boolean;
  readAt: string | null;
  createdAt: string;
}

interface PairState {
  paired: boolean;
  pair?: { id: string; inviteCode: string };
  me?: { userId: string; name: string; nickname: string | null };
  partner?: { userId: string; name: string; nickname: string | null; lastSeenAt: string | null } | null;
  push: { configured: boolean; publicKey: string | null };
}

interface RunInfo {
  since: string;
  waitedMs: number;
  count: number;
  urgent: boolean;
  preview: string;
}

interface StatusState {
  now: string;
  iOwe: RunInfo | null;
  partnerOwes: RunInfo | null;
  nextReminder: { dueAt: string; step: number } | null;
  unread: number;
  snoozedUntil: string | null;
  remindersEnabled: boolean;
  inQuietHours: boolean;
}

export default function BerduaChatPage() {
  const router = useRouter();
  const [pair, setPair] = useState<PairState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [draft, setDraft] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [noReplyNeeded, setNoReplyNeeded] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [pushOn, setPushOn] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageAt = useRef<string | null>(null);

  const partnerName = pair?.partner?.nickname?.trim() || pair?.partner?.name || "Dia";

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api<StatusState>("/api/berdua/status"));
    } catch {
      // Status cuma pemanis; kalau gagal, chat tetep jalan.
    }
  }, []);

  const markRead = useCallback(async () => {
    await api("/api/berdua/read", { method: "POST" }).catch(() => undefined);
  }, []);

  // --- Booting: cek pasangan, tarik pesan, daftarin service worker ---------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pairState = await api<PairState>("/api/berdua/pair");
        if (cancelled) return;

        if (!pairState.paired || !pairState.partner) {
          router.replace("/berdua/setup");
          return;
        }
        setPair(pairState);

        const data = await api<{ messages: Message[] }>("/api/berdua/messages");
        if (cancelled) return;

        setMessages(data.messages);
        lastMessageAt.current = data.messages.at(-1)?.createdAt ?? null;
        setLoading(false);
        scrollToBottom();

        await markRead();
        await refreshStatus();

        await registerServiceWorker();
        setPushOn(Boolean(await getExistingSubscription()));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BerduaApiError && err.status === 401) {
          router.replace("/berdua/masuk");
          return;
        }
        if (err instanceof BerduaApiError && err.code === "NO_PAIR") {
          router.replace("/berdua/setup");
          return;
        }
        setBanner({ tone: "error", text: (err as Error).message });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, scrollToBottom, markRead, refreshStatus]);

  // --- Polling pesan baru --------------------------------------------------
  useEffect(() => {
    if (!pair?.paired) return;

    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const query = lastMessageAt.current
          ? `?after=${encodeURIComponent(lastMessageAt.current)}`
          : "";
        const data = await api<{ messages: Message[] }>(`/api/berdua/messages${query}`);
        if (data.messages.length === 0) return;

        const stick = isNearBottom();
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...data.messages.filter((m) => !seen.has(m.id))];
        });
        lastMessageAt.current = data.messages.at(-1)!.createdAt;
        if (stick) scrollToBottom(true);

        await markRead();
        await refreshStatus();
      } catch {
        // Sinyal jelek, coba lagi di tick berikutnya.
      }
    };

    const messageTimer = setInterval(tick, 4000);
    const statusTimer = setInterval(refreshStatus, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick();
        markRead();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(messageTimer);
      clearInterval(statusTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pair?.paired, scrollToBottom, markRead, refreshStatus]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const data = await api<{ message: Message }>("/api/berdua/messages", {
        method: "POST",
        body: JSON.stringify({
          content,
          priority: urgent ? "urgent" : "normal",
          needsReply: !noReplyNeeded,
        }),
      });

      setMessages((prev) => [...prev, data.message]);
      lastMessageAt.current = data.message.createdAt;
      setDraft("");
      setUrgent(false);
      setNoReplyNeeded(false);
      scrollToBottom(true);
      await refreshStatus();
    } catch (err) {
      setBanner({ tone: "error", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handleSnooze = async (minutes: number) => {
    try {
      await api("/api/berdua/snooze", {
        method: "POST",
        body: JSON.stringify({ minutes }),
      });
      await refreshStatus();
      setBanner({
        tone: "info",
        text: minutes > 0 ? `Oke, diingetin lagi nanti.` : "Snooze dibatalin.",
      });
    } catch (err) {
      setBanner({ tone: "error", text: (err as Error).message });
    }
  };

  const handleNudge = async () => {
    try {
      const res = await api<{ partnerInQuietHours: boolean }>("/api/berdua/nudge", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setBanner({
        tone: "info",
        text: res.partnerInQuietHours
          ? `Kecolek, tapi ${partnerName} lagi jam tenang.`
          : `${partnerName} udah dicolek.`,
      });
    } catch (err) {
      setBanner({ tone: "error", text: (err as Error).message });
    }
  };

  const handleEnablePush = async () => {
    const result = await enablePush(pair?.push.publicKey ?? null);
    if (result.ok) {
      setPushOn(true);
      setBanner({ tone: "info", text: "Notifikasi nyala." });
      return;
    }

    const reasons: Record<string, string> = {
      "needs-install": "Di iPhone, install dulu ke Home Screen baru notifikasinya bisa nyala.",
      denied: "Izin notifikasi ditolak. Buka setelan browser buat ngizinin.",
      "no-key": "Server belum diset VAPID key-nya.",
      unsupported: "Browser ini gak dukung notifikasi push.",
      error: "Gagal nyalain notifikasi, coba lagi.",
    };
    setBanner({ tone: "error", text: reasons[result.reason ?? "error"] });
  };

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e0457b] border-t-transparent" />
      </main>
    );
  }

  const showIosInstallHint = isIOS() && !isStandalone();
  const showPushPrompt = !showIosInstallHint && isPushSupported() && pushOn === false;

  return (
    <main className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#e0457b] to-[#7c3aed] text-sm font-semibold">
          {partnerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{partnerName}</p>
          <p className="truncate text-xs text-[#a99cc0]">
            {status?.partnerOwes
              ? `belum bales ${formatDurationMs(status.partnerOwes.waitedMs)}`
              : status?.iOwe
                ? "giliran lo bales"
                : "aman, gak ada yang ngegantung"}
          </p>
        </div>
        <Link
          href="/berdua/pengaturan"
          className="rounded-lg p-2 text-[#a99cc0] transition hover:bg-white/5 hover:text-white"
          aria-label="Pengaturan"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M10.3 4.3a1 1 0 011-.8h1.4a1 1 0 011 .8l.2 1.2a6.5 6.5 0 011.5.9l1.2-.5a1 1 0 011.2.4l.7 1.2a1 1 0 01-.2 1.3l-1 .8a6.6 6.6 0 010 1.7l1 .8a1 1 0 01.2 1.3l-.7 1.2a1 1 0 01-1.2.4l-1.2-.5a6.5 6.5 0 01-1.5.9l-.2 1.2a1 1 0 01-1 .8h-1.4a1 1 0 01-1-.8l-.2-1.2a6.5 6.5 0 01-1.5-.9l-1.2.5a1 1 0 01-1.2-.4l-.7-1.2a1 1 0 01.2-1.3l1-.8a6.6 6.6 0 010-1.7l-1-.8a1 1 0 01-.2-1.3l.7-1.2a1 1 0 011.2-.4l1.2.5a6.5 6.5 0 011.5-.9l.2-1.2z"
            />
            <circle cx="12" cy="12" r="2.5" strokeWidth={1.8} />
          </svg>
        </Link>
      </header>

      {banner && (
        <button
          type="button"
          onClick={() => setBanner(null)}
          className={`px-4 py-2 text-left text-xs ${
            banner.tone === "error"
              ? "bg-red-500/15 text-red-200"
              : "bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {banner.text} <span className="opacity-60">(tap buat nutup)</span>
        </button>
      )}

      {showIosInstallHint && (
        <div className="border-b border-white/10 bg-[#1a1226] px-4 py-2.5 text-xs text-[#c9bde0]">
          <b className="text-white">iPhone:</b> buka menu Share → <b>Add to Home Screen</b>.
          Notifikasi cuma jalan dari sana.
        </div>
      )}

      {showPushPrompt && (
        <button
          type="button"
          onClick={handleEnablePush}
          className="border-b border-white/10 bg-[#1a1226] px-4 py-2.5 text-left text-xs text-[#c9bde0]"
        >
          Notifikasi masih mati — <b className="text-white underline">nyalain sekarang</b> biar
          remindernya kekirim.
        </button>
      )}

      <ReplyStatusCard
        status={status}
        partnerName={partnerName}
        onSnooze={handleSnooze}
        onNudge={handleNudge}
        onFocusInput={() => inputRef.current?.focus()}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[#6f6485]">
            <p>Belum ada apa-apa di sini.</p>
            <p className="mt-1">Mulai dari yang paling gampang aja.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((message, index) => {
              const mine = message.senderId === pair?.me?.userId;
              const previous = messages[index - 1];
              const showDay =
                !previous || formatDayLabel(previous.createdAt) !== formatDayLabel(message.createdAt);

              return (
                <div key={message.id}>
                  {showDay && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] uppercase tracking-wider text-[#6f6485]">
                        {formatDayLabel(message.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-[#e0457b] text-white"
                          : "rounded-bl-md border border-white/5 bg-[#251c35] text-[#efe9f7]"
                      } ${message.priority === "urgent" ? "ring-1 ring-amber-300/70" : ""}`}
                    >
                      {message.priority === "urgent" && (
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                          ⚡ penting
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <div
                        className={`mt-0.5 flex items-center justify-end gap-1.5 text-[10px] ${
                          mine ? "text-white/70" : "text-[#8f83a8]"
                        }`}
                      >
                        {!message.needsReply && <span>gak perlu dibales</span>}
                        <span>{formatClock(message.createdAt)}</span>
                        {mine && <span>{message.readAt ? "dibaca" : "terkirim"}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-white/10 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]"
      >
        <div className="mb-2 flex gap-2 text-[11px]">
          <Chip active={urgent} onClick={() => setUrgent((v) => !v)}>
            ⚡ Penting
          </Chip>
          <Chip active={noReplyNeeded} onClick={() => setNoReplyNeeded((v) => !v)}>
            Gak usah dibales
          </Chip>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Tulis ke ${partnerName}...`}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-[#6f6485] focus:border-[#e0457b]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e0457b] transition disabled:opacity-40"
            aria-label="Kirim"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 transition ${
        active
          ? "border-[#e0457b] bg-[#e0457b]/20 text-white"
          : "border-white/10 text-[#8f83a8] hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function ReplyStatusCard({
  status,
  partnerName,
  onSnooze,
  onNudge,
  onFocusInput,
}: {
  status: StatusState | null;
  partnerName: string;
  onSnooze: (minutes: number) => void;
  onNudge: () => void;
  onFocusInput: () => void;
}) {
  if (!status) return null;

  if (status.iOwe) {
    const snoozed = status.snoozedUntil && new Date(status.snoozedUntil) > new Date();
    return (
      <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-3">
        <p className="text-sm font-medium text-amber-100">
          {partnerName} nunggu {formatDurationMs(status.iOwe.waitedMs)}
          {status.iOwe.count > 1 ? ` · ${status.iOwe.count} pesan` : ""}
        </p>
        <p className="mt-0.5 text-xs text-amber-200/70">
          {!status.remindersEnabled
            ? "Reminder lagi dimatiin."
            : snoozed
              ? `Ditunda sampai ${formatClock(status.snoozedUntil!)}.`
              : status.nextReminder
                ? `Bakal diingetin lagi jam ${formatClock(status.nextReminder.dueAt)}.`
                : "Gak ada reminder terjadwal."}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={onFocusInput}
            className="rounded-full bg-amber-300 px-3 py-1.5 font-semibold text-[#3a2a05]"
          >
            Bales sekarang
          </button>
          <button
            type="button"
            onClick={() => onSnooze(60)}
            className="rounded-full border border-amber-300/40 px-3 py-1.5 text-amber-100"
          >
            Nanti 1 jam
          </button>
          <button
            type="button"
            onClick={() => onSnooze(snoozed ? 0 : 180)}
            className="rounded-full border border-amber-300/40 px-3 py-1.5 text-amber-100"
          >
            {snoozed ? "Batalin tunda" : "Nanti 3 jam"}
          </button>
        </div>
      </div>
    );
  }

  if (status.partnerOwes) {
    return (
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <p className="flex-1 text-xs text-[#a99cc0]">
          {partnerName} belum bales {formatDurationMs(status.partnerOwes.waitedMs)}.
        </p>
        <button
          type="button"
          onClick={onNudge}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
        >
          👉 Colek
        </button>
      </div>
    );
  }

  return null;
}
