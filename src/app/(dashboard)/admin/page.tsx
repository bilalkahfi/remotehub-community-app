"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AdminBadge } from "@/components/ui/AdminBadge";
import {
  Users,
  MessageSquare,
  Hash,
  Reply,
  MessageCircle,
  FolderOpen,
  TrendingUp,
  Activity,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalReplies: number;
  totalChatMessages: number;
  totalMessages: number;
  totalCategories: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const userRole = (user as any)?.role;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    if (loading) return;
    if (!isAdminOrOwner) return;

    const token = localStorage.getItem("token");
    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [loading, isAdminOrOwner]);

  if (loading || fetchLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdminOrOwner) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <Users className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">You don't have access to this page.</p>
        <Link href="/forum">
          <button className="mt-4 text-sm text-accent hover:underline">Go to Forum</button>
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Forum Posts", value: stats?.totalPosts ?? 0, icon: MessageSquare, color: "text-green-400" },
    { label: "Forum Replies", value: stats?.totalReplies ?? 0, icon: Reply, color: "text-purple-400" },
    { label: "Chat Messages", value: stats?.totalChatMessages ?? 0, icon: Hash, color: "text-orange-400" },
    { label: "Private Messages", value: stats?.totalMessages ?? 0, icon: MessageCircle, color: "text-pink-400" },
    { label: "Categories", value: stats?.totalCategories ?? 0, icon: FolderOpen, color: "text-cyan-400" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--header-primary)]">Admin Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Welcome back, {user?.name} <AdminBadge role={userRole} />
          </p>
        </div>
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Users
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-modifier-accent)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--header-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Recent Users
          </h2>
        </div>
        <div className="rounded-lg overflow-hidden border border-[var(--bg-modifier-accent)]">
          {recentUsers.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i % 2 === 0 ? "bg-[var(--bg-secondary)]" : "bg-[var(--bg-primary)]"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/members/${u.id}`}
                    className="text-sm font-medium text-[var(--text-link)] hover:underline truncate"
                  >
                    {u.name}
                  </Link>
                  <AdminBadge role={u.role} size="xs" />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
              </div>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                {new Date(u.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
