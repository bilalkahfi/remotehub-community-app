"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { Search, Users } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
  _count: {
    forumPosts: number;
    forumReplies: number;
  };
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/users?q=${encodeURIComponent(q)}` : "/api/users";
      const res = await fetch(url);
      const data = await res.json();
      setMembers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(search);
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]"
          />
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Users className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No members found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
            >
              <div className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-normal)] truncate">
                  {member.name}
                </h3>
                {member.bio && (
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {member.bio}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-shrink-0">
                <span>{member._count.forumPosts} threads</span>
                <span>{member._count.forumReplies} replies</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
