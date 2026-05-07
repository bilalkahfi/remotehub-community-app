"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/forum");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
      }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <span className="text-lg font-bold text-white tracking-tight">
          Remote<span className="text-indigo-400">Hub</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login"
            className="text-sm text-white/40 hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
          >
            Daftar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 sm:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{
            background: "rgba(99,102,241,0.08)",
            borderColor: "rgba(99,102,241,0.2)",
            color: "#818cf8"
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Komunitas Remote Worker Indonesia
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-4">
          <span className="text-white">Ngobrol, Kolaborasi,</span><br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
            Bareng Remote Worker
          </span>
        </h1>
        <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10"
          style={{color: "rgba(255,255,255,0.4)"}}
        >
          Forum diskusi, chat real-time, dan voice room khusus untuk pekerja remote
          Indonesia. Temukan komunitas, bagikan pengalaman, dan berkembang bersama.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
            }}
          >
            Gabung Sekarang →
          </Link>
          <Link href="/login"
            className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Masuk
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative text-center pb-8">
        <p className="text-xs" style={{color: "rgba(255,255,255,0.15)"}}>
          RemoteHub · Next.js + Socket.io + PostgreSQL
        </p>
      </footer>
    </div>
  );
}
