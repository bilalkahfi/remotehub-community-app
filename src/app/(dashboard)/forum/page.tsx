"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Hash, MessageSquare, Users, ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  _count: { posts: number };
}

export default function ForumPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--header-primary)]">Forum</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Jelajahi diskusi dan topik dari komunitas
        </p>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
            <Hash className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Belum ada kategori forum</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum/${cat.slug}`}
              className="group flex items-center gap-4 px-4 py-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--bg-modifier-accent)] hover:border-accent/30 transition-all"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-[#667eea]" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-[var(--header-primary)] group-hover:text-accent transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                  {cat.description}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{cat._count.posts}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Community Stats */}
      <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 border border-[#667eea]/10">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#667eea]" />
          <p className="text-xs text-[var(--text-muted)]">
            <span className="text-[var(--header-primary)] font-semibold">{categories.length}</span> kategori forum — Ayo berdiskusi dan berbagi ilmu dengan sesama remote worker!
          </p>
        </div>
      </div>
    </div>
  );
}
