"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, phone, password);
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Logo & Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] mb-3 shadow-lg shadow-purple-500/20">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Daftar</h2>
        <p className="mt-2 text-sm text-white/60">
          Gabung dengan komunitas remote worker Indonesia.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/70">Nama Lengkap</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea]/50 transition-all" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/70">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea]/50 transition-all" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/70">No. HP</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" required
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea]/50 transition-all" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/70">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea]/50 transition-all" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/70">Konfirmasi Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Masukkan ulang password" required
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea]/50 transition-all" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Daftar...</span>
            </div>
          ) : (
            "Daftar"
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-white/50">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-[#667eea] hover:text-[#764ba2] font-medium transition-colors">
          Masuk
        </Link>
      </p>
    </>
  );
}
