"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Plus, Search } from "lucide-react";

interface ConversationUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Conversation {
  user: ConversationUser;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/messages/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchConversations();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const filtered = conversations.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-modifier-accent)] flex-shrink-0">
        <h2 className="text-base font-semibold text-[var(--header-primary)]">Direct Messages</h2>
        <Link
          href="/members"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors text-[var(--interactive-normal)] hover:text-[var(--interactive-hover)]"
          title="New Message"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Find or start a conversation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-[var(--bg-tertiary)] text-[var(--text-normal)] border-none focus:outline-none focus:ring-1 focus:ring-accent placeholder-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto discord-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
            <Link
              href="/members"
              className="mt-2 text-sm text-accent hover:underline"
            >
              Start a new conversation
            </Link>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => (
              <Link
                key={conv.user.id}
                href={`/messages/${conv.user.id}`}
                className="flex items-center gap-3 px-3 py-2 mx-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div className="relative w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                  {conv.user.avatarUrl ? (
                    <img src={conv.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    conv.user.name.charAt(0).toUpperCase()
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--header-primary)] truncate">
                      {conv.user.name}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 ml-2">
                      {formatDate(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[var(--status-dnd)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
