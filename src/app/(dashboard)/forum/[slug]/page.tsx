"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Hash, MessageSquare, Pin, Lock } from "lucide-react";

interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: Author;
  _count: { replies: number };
  pinned?: boolean;
  locked?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/categories/${slug}?page=${page}`);
      const data = await res.json();
      setCategory(data.category);
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [slug]);

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          categoryId: category?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setShowCreateForm(false);
      setNewTitle("");
      setNewContent("");
      fetchPosts(1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-6">
      {/* Create Post Button & Form */}
      <div className="mb-4">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
        >
          <span className="text-lg leading-none">{showCreateForm ? "−" : "+"}</span>
          {showCreateForm ? "Cancel" : "New Thread"}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreatePost}
          className="mb-6 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-modifier-accent)] space-y-3"
        >
          <input
            type="text"
            placeholder="Thread title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]"
            required
          />
          <textarea
            placeholder="Thread content..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-y"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} size="sm">
              Post
            </Button>
          </div>
        </form>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Hash className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No threads yet</p>
          <p className="text-xs mt-1">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/forum/${slug}/${post.id}`)}
              className="flex items-start gap-4 px-4 py-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--bg-modifier-accent)] hover:border-accent/20 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5">
                {post.author.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.pinned && <span title="Pinned"><Pin className="w-3.5 h-3.5 text-accent flex-shrink-0" /></span>}
                  {post.locked && <span title="Locked"><Lock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" /></span>}
                  <h3 className="font-semibold text-sm text-[var(--header-primary)] group-hover:text-accent transition-colors truncate">
                    {post.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[var(--text-link)] font-medium">{post.author.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">· {formatDate(post.createdAt)}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-1 leading-relaxed">
                  {post.content}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-shrink-0 px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-modifier-accent)] transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="font-medium">{post._count.replies}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => fetchPosts(page)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  page === pagination.page
                    ? "bg-accent text-white"
                    : "text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
