"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users straight to forum
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

  // If user is logged in, don't show landing page
  if (user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary-600 to-blue-500 bg-clip-text text-transparent">
            RemoteHub
          </span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Komunitas untuk para pekerja remote Indonesia. Diskusi, kolaborasi, dan berkembang bersama.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {user ? (
            <Link href="/forum">
              <Button size="lg">Masuk ke Forum</Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg">Gabung Sekarang</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Forum Diskusi</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Diskusikan topik seputar remote work, tips produktivitas, tools, dan karir.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Pesan Pribadi</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Chat real-time dengan sesama anggota komunitas.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Voice & Video</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Ngobrol langsung via voice call atau video conference.
          </p>
        </div>
      </section>
    </div>
  );
}
