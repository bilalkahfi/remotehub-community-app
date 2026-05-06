"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { Users, Search, AlertTriangle, Ban } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  warnedAt: string | null;
  warnedReason: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  isOnline: boolean;
  warnExpired: boolean;
  _count: {
    forumPosts: number;
    forumReplies: number;
  };
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [banModal, setBanModal] = useState<{ userId: string; userName: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  const userRole = (user as any)?.role;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";
  const isOwner = userRole === "owner";

  const fetchUsers = async (q = "") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = q ? `/api/admin/users?q=${encodeURIComponent(q)}` : "/api/admin/users";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAdminUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Yakin ingin mengubah role user ini menjadi ${newRole}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) fetchUsers(query);
      else { const d = await res.json(); alert(d.error || "Gagal"); }
    } catch (err) { console.error(err); }
  };

  const handleWarn = async (userId: string) => {
    const reason = prompt("Alasan peringatan (berlaku 7 hari):");
    if (!reason || !reason.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, reason: reason.trim() }),
      });
      if (res.ok) fetchUsers(query);
      else { const d = await res.json(); alert(d.error || "Gagal"); }
    } catch (err) { console.error(err); }
  };

  const handleRevokeWarn = async (userId: string, userName: string) => {
    if (!confirm(`Revoke warning untuk ${userName}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, revokeWarn: true }),
      });
      if (res.ok) fetchUsers(query);
      else { const d = await res.json(); alert(d.error || "Gagal"); }
    } catch (err) { console.error(err); }
  };

  const handleBan = async () => {
    if (!banModal || !banReason.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: banModal.userId, action: "ban", reason: banReason.trim() }),
      });
      if (res.ok) { setBanModal(null); setBanReason(""); fetchUsers(query); }
      else { const d = await res.json(); alert(d.error || "Gagal"); }
    } catch (err) { console.error(err); }
  };

  const handleUnban = async (userId: string, userName: string) => {
    if (!confirm(`Unban ${userName}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, action: "unban" }),
      });
      if (res.ok) fetchUsers(query);
      else { const d = await res.json(); alert(d.error || "Gagal"); }
    } catch (err) { console.error(err); }
  };

  if (!isAdminOrOwner) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <Users className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">You don't have access to this page.</p>
        <Link href="/forum"><button className="mt-4 text-sm text-accent hover:underline">Go to Forum</button></Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--header-primary)]">User Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {adminUsers.length} user{adminUsers.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]" />
        </div>
      </form>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBanModal(null)}>
          <div className="bg-[var(--bg-primary)] rounded-xl p-6 w-full max-w-md shadow-2xl border border-[var(--bg-modifier-accent)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Ban className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-[var(--header-primary)]">Ban {banModal.userName}</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">User ini sudah di-warn sebelumnya dan masih melanggar. Masukkan alasan ban:</p>
            <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} placeholder="Alasan ban..."
              className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBanModal(null)} className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">Cancel</button>
              <button onClick={handleBan} disabled={!banReason.trim()} className="px-3 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">Ban User</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
      ) : adminUsers.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]"><Users className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">No users found</p></div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-[var(--bg-modifier-accent)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2.5">User</th>
                  <th className="text-left px-4 py-2.5">Role</th>
                  <th className="text-left px-4 py-2.5">Posts</th>
                  <th className="text-left px-4 py-2.5">Joined</th>
                  <th className="text-right px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u, i) => (
                  <tr key={u.id} className={`${i % 2 === 0 ? "bg-[var(--bg-primary)]" : "bg-[var(--bg-secondary)]"} hover:bg-[var(--bg-hover)] transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 flex-shrink-0">
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-semibold overflow-hidden">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-[var(--bg-primary)]" />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/members/${u.id}`} className="text-sm font-medium text-[var(--text-link)] hover:underline truncate block leading-tight">{u.name}</Link>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge role={u.role} />
                      {u.bannedAt && <span className="ml-1 text-[10px] text-red-400 font-semibold">BANNED</span>}
                      {u.warnedAt && !u.bannedAt && <span className="ml-1 text-[10px] text-orange-400">WARNED</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{u._count.forumPosts} posts, {u._count.forumReplies} replies</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.bannedAt ? (
                          <button onClick={() => handleUnban(u.id, u.name)}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Unban</button>
                        ) : (
                          <>
                            {isOwner && u.role !== "owner" && u.role !== "owner" && (
                              u.role === "admin"
                                ? <button onClick={() => handleRoleChange(u.id, "user")} className="px-2 py-1 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Demote</button>
                                : <button onClick={() => handleRoleChange(u.id, "admin")} className="px-2 py-1 rounded text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20">Promote</button>
                            )}
                            {isAdminOrOwner && u.role !== "owner" && (
                              u.warnedAt && !u.warnExpired ? (
                                <>
                                  <button onClick={() => handleRevokeWarn(u.id, u.name)}
                                    className="px-2 py-1 rounded text-[10px] font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Revoke</button>
                                  <button onClick={() => setBanModal({ userId: u.id, userName: u.name })}
                                    className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Ban</button>
                                </>
                              ) : (
                                <button onClick={() => handleWarn(u.id)}
                                  className="px-2 py-1 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors">Warn</button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
