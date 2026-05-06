"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Member {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  _count: {
    forumPosts: number;
    forumReplies: number;
  };
}

export function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Only show on forum, voice pages
  const isForum = pathname?.startsWith("/forum");
  const isVoice = pathname?.startsWith("/voice");
  const isMembers = pathname?.startsWith("/members");

  // Hide on members page (already showing list in channel sidebar) and on messages page
  const shouldShow = (isForum || isVoice) && !isMembers;

  useEffect(() => {
    if (!shouldShow) return;
    fetchMembers();
  }, [shouldShow]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setMembers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShow) return null;

  const onlineMembers = members;
  const onlineCount = onlineMembers.length;

  return (
    <div className="flex flex-col w-60 bg-[var(--bg-secondary)] flex-shrink-0 border-l border-[var(--bg-tertiary)]">
      <div className="h-[48px] flex items-center px-4 border-b border-[var(--bg-tertiary)] flex-shrink-0">
        <h2 className="font-semibold text-sm text-[var(--text-normal)]">
          Online — {onlineCount}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 discord-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Online — {onlineCount}
            </h3>
            {onlineMembers.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)] ${
                  pathname === `/members/${member.id}`
                    ? "bg-[var(--bg-selected)] text-[var(--interactive-active)]"
                    : ""
                }`}
              >
                <div className="relative w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-secondary)]" />
                </div>
                <span className="truncate">{member.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
