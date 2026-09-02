"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "masuk" | "daftar";

export default function BerduaMasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("masuk");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "masuk" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "masuk"
          ? { email: form.email, password: form.password }
          : form;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal masuk");

      localStorage.setItem("token", data.token);
      router.replace("/berdua");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/berdua/icon-192.png"
            alt=""
            className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-lg shadow-fuchsia-900/40"
          />
          <h1 className="text-2xl font-semibold tracking-tight">Berdua</h1>
          <p className="mt-1 text-sm text-[#a99cc0]">
            Ruang chat buat berdua doang.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
          {(["masuk", "daftar"] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === value ? "bg-[#e0457b] text-white" : "text-[#a99cc0]"
              }`}
            >
              {value === "masuk" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "daftar" && (
            <>
              <Field
                label="Nama"
                value={form.name}
                onChange={update("name")}
                placeholder="Nama panggilan lo"
                required
              />
              <Field
                label="Nomor HP"
                value={form.phone}
                onChange={update("phone")}
                placeholder="08xxxxxxxxxx"
                required
              />
            </>
          )}
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="email@contoh.com"
            required
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
            placeholder="Minimal 8 karakter"
            required
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#e0457b] py-3 text-sm font-semibold text-white transition hover:bg-[#c93a6c] disabled:opacity-50"
          >
            {loading ? "Bentar..." : mode === "masuk" ? "Masuk" : "Bikin akun"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#a99cc0]">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-[#6f6485] outline-none transition focus:border-[#e0457b]"
      />
    </label>
  );
}
