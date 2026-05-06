"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Hash, MessageSquare, Pin, Lock, Unlock, Trash2 } from "lucide-react";

interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  category: Category;
  replies: Reply[];
}

export default function PostDetailPage() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingPin, setTogglingPin] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  const userRole = (user as any)?.role;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/posts/${postId}`);
      const data = await res.json();
      setPost(data.post);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/forum/replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyContent, postId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setReplyContent("");
      fetchPost();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Yakin ingin menghapus thread ini?")) return;
    setDeleting("post");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        window.location.href = `/forum/${slug}`;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePin = async () => {
    setTogglingPin(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: !(post as any)?.pinned }),
      });
      if (res.ok) {
        await fetchPost();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingPin(false);
    }
  };

  const handleToggleLock = async () => {
    setTogglingLock(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ locked: !(post as any)?.locked }),
      });
      if (res.ok) {
        await fetchPost();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingLock(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Yakin ingin menghapus balasan ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/forum/replies?id=${replyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchPost();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <Hash className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">Thread not found</p>
        <Link href={`/forum/${slug}`}>
          <Button variant="ghost" size="sm" className="mt-4">
            Go back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Post */}
      <div className="flex gap-4 pb-4 mb-4 border-b border-[var(--bg-modifier-accent)]">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-1 overflow-hidden">
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            post.author.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {(post as any).pinned && (
                <span title="Pinned">
                  <Pin className="w-4 h-4 text-accent flex-shrink-0" />
                </span>
              )}
              {(post as any).locked && (
                <span title="Locked">
                  <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                </span>
              )}
              <h1 className="text-base font-semibold text-[var(--header-primary)] truncate">
                {post.title}
              </h1>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isAdminOrOwner && (
                <>
                  <button
                    onClick={handleTogglePin}
                    disabled={togglingPin}
                    className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors ${
                      (post as any).pinned ? "text-accent" : "text-[var(--text-muted)]"
                    }`}
                    title={(post as any).pinned ? "Unpin" : "Pin thread"}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleToggleLock}
                    disabled={togglingLock}
                    className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors ${
                      (post as any).locked ? "text-yellow-500" : "text-[var(--text-muted)]"
                    }`}
                    title={(post as any).locked ? "Unlock thread" : "Lock thread"}
                  >
                    {(post as any).locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  {(user?.id === post.author.id || isAdminOrOwner) && (
                    <button
                      onClick={handleDeletePost}
                      disabled={deleting === "post"}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      title="Delete thread"
                    >
                      {deleting === "post" ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </>
              )}
              {!isAdminOrOwner && user?.id === post.author.id && (
                <Button variant="danger" size="sm" onClick={handleDeletePost} loading={deleting === "post"}>
                  Delete
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-muted)]">
            <Link href={`/members/${post.author.id}`} className="text-[var(--text-link)] hover:underline">
              {post.author.name}
            </Link>
            <span>· {formatDate(post.createdAt)}</span>
          </div>
          <div className="mt-3 text-sm text-[var(--text-normal)] whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 px-3">
          Replies ({post.replies.length})
        </h2>

        {post.replies.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-6">
            No replies yet. Be the first!
          </p>
        ) : (
          <div className="space-y-2">
            {post.replies.map((reply) => (
              <div
                key={reply.id}
                className="flex gap-3 px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                  {reply.author.avatarUrl ? (
                    <img src={reply.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    reply.author.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/members/${reply.author.id}`}
                      className="text-xs font-medium text-[var(--text-link)] hover:underline"
                    >
                      {reply.author.name}
                    </Link>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      · {formatDate(reply.createdAt)}
                    </span>
                    {(user?.id === reply.author.id || isAdminOrOwner) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReply(reply.id);
                        }}
                        className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-400 transition-all"
                        title="Delete reply"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-normal)] mt-0.5 whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Form */}
      {(post as any).locked ? (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-[var(--text-muted)] text-center">
          <Lock className="w-4 h-4 inline mr-1" />
          Thread ini telah dikunci. Tidak bisa menambahkan balasan baru.
        </div>
      ) : (
        <form onSubmit={handleReply} className="space-y-2">
          <textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-y"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} size="sm">
              Reply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
