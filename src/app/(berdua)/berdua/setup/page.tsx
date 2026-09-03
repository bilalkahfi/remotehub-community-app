"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, BerduaApiError } from "@/lib/berdua/client";

interface PairResponse {
  paired: boolean;
  pair?: { id: string; inviteCode: string };
  partner?: { userId: string; name: string } | null;
}

export default function BerduaSetupPage() {
  const router = useRouter();
  const [state, setState] = useState<PairResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<PairResponse>("/api/berdua/pair");
      if (data.paired && data.partner) {
        router.replace("/berdua");
        return;
      }
      setState(data);
    } catch (err) {
      if (err instanceof BerduaApiError && err.status === 401) {
        router.replace("/berdua/masuk");
        return;
      }
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Pasangan bisa gabung kapan aja, jadi halaman ini ngecek berkala.
  useEffect(() => {
    if (!state?.paired) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [state?.paired, load]);

  const createPair = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/berdua/pair", { method: "POST" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const joinPair = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/berdua/pair/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      router.replace("/berdua");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!state?.pair) return;
    try {
      await navigator.clipboard.writeText(state.pair.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal nyalin, catat manual aja ya");
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sambungin berdua</h1>
      <p className="mt-2 text-sm text-[#a99cc0]">
        Satu ruang cuma muat dua orang. Sisanya gak bisa masuk.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {state?.paired && state.pair ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-[#a99cc0]">Kode undangan</p>
          <p className="my-3 font-mono text-3xl font-bold tracking-[0.3em] text-[#f9a8d4]">
            {state.pair.inviteCode}
          </p>
          <p className="text-sm text-[#a99cc0]">
            Kasih kode ini ke dia. Begitu dia masukin kodenya, kodenya langsung hangus.
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-4 w-full rounded-xl border border-white/15 py-2.5 text-sm font-medium transition hover:bg-white/5"
          >
            {copied ? "Kesalin ✓" : "Salin kode"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[#6f6485]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#e0457b]" />
            Nungguin dia gabung...
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <button
            type="button"
            onClick={createPair}
            disabled={busy}
            className="w-full rounded-xl bg-[#e0457b] py-3 text-sm font-semibold text-white transition hover:bg-[#c93a6c] disabled:opacity-50"
          >
            Bikin ruang baru
          </button>

          <div className="flex items-center gap-3 text-xs text-[#6f6485]">
            <span className="h-px flex-1 bg-white/10" />
            atau
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#a99cc0]">
                Punya kode dari dia?
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={16}
                autoCapitalize="characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white placeholder-[#4a4159] outline-none focus:border-[#e0457b]"
              />
            </label>
            <button
              type="button"
              onClick={joinPair}
              disabled={busy || code.trim().length < 4}
              className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-40"
            >
              Gabung
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
