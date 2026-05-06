"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Hash, Send, AtSign, Trash2 } from "lucide-react";
import Link from "next/link";
import { AvatarModal } from "@/components/ui/AvatarModal";

interface ChatUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface GlobalMessage {
  id: string;
  content: string;
  createdAt: string;
  author: ChatUser;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [hashOpen, setHashOpen] = useState(false);
  const [hashSearch, setHashSearch] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [avatarTarget, setAvatarTarget] = useState<ChatUser | null>(null);
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

const isAdminOrOwner = user?.role === "admin" || user?.role === "owner";

  const handleDeleteMessage = async (msgId: string) => {
    if (deletingMsg) return;
    setDeletingMsg(msgId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/chat?id=${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingMsg(null);
    }
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const hashRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []))
      .catch(console.error);
    fetch("/api/forum/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Auto-scroll only when new messages arrive AND user is near bottom
  // Uses useEffect to run AFTER React re-renders (not during fetch)
  useEffect(() => {
    if (!loading && isNearBottom()) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, loading]);

  // Close mention dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
      if (hashRef.current && !hashRef.current.contains(e.target as Node)) {
        setHashOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setNewMessage("");
      // Force scroll after send - handled by useEffect on messages
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "";
    if (days === 1) return "Yesterday ";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " ";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bg-modifier-accent)] flex-shrink-0">
        <Hash className="w-5 h-5 text-[var(--text-muted)]" />
        <h2 className="text-base font-semibold text-[var(--header-primary)]">chat</h2>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 discord-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <Hash className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isAdminOrOwner && (
              <p className="text-[10px] text-[var(--text-muted)] text-center">
                Anda admin — klik <Trash2 className="w-3 h-3 inline" /> untuk hapus pesan
              </p>
            )}
            {messages.map((msg, idx) => {
              const isMine = msg.author.id === user?.id;
              const showDate = idx === 0 || formatDate(msg.createdAt) !== formatDate(messages[idx - 1]?.createdAt);

              return (
                <div key={msg.id}>
                  {showDate && formatDate(msg.createdAt) && (
                    <div className="flex items-center justify-center gap-2 my-4">
                      <div className="flex-1 h-px bg-[var(--bg-modifier-accent)]" />
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{formatDate(msg.createdAt)}</span>
                      <div className="flex-1 h-px bg-[var(--bg-modifier-accent)]" />
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                    {/* Avatar for other people */}
                    {!isMine && (
                      <div
                        className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => msg.author.avatarUrl && setAvatarTarget(msg.author)}
                      >
                        {msg.author.avatarUrl ? (
                          <img src={msg.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          msg.author.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[70%] ${isMine ? "order-1" : "order-1"}`}>
                      {/* Name (other people only) */}
                      {!isMine && (
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 ml-1">{msg.author.name}</p>
                      )}

                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-[#005c4b] dark:bg-[#005c4b] text-white rounded-br-md"
                          : "bg-[#e8e8eb] dark:bg-[#2b2d31] text-[#1e1f22] dark:text-[#dbdee1] rounded-bl-md"
                      }`}>
                        <p>
                          {msg.content.split(/(@(?:everyone|[^\s]+\s+[^\s]+|[^\s]+)|#[^\s]+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                              const name = part.slice(1);
                              return (
                                <Link
                                  key={i}
                                  href={`/members?q=${encodeURIComponent(name)}`}
                                  className="text-[var(--text-link)] hover:underline font-medium"
                                >
                                  {part}
                                </Link>
                              );
                            }
                            if (part.startsWith('#')) {
                              const slug = part.slice(1);
                              return (
                                <Link
                                  key={i}
                                  href={'/forum/' + slug.toLowerCase()}
                                  className='text-[#667eea] hover:underline font-semibold'
                                >
                                  {part}
                                </Link>
                              );
                            }
                            return part;
                          })}
                        </p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          isMine ? "text-white/60" : "text-[var(--text-muted)]"
                        }`}>
                          <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                          {isMine && (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M3.5 6.5L5 8l3.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                            </svg>
                          )}
                          {isAdminOrOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(msg.id);
                              }}
                              className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-black/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                              title="Delete message"
                            >
                              {deletingMsg === msg.id ? (
                                <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Spacer for own messages (avatar placeholder) */}
                    {isMine && <div className="w-8" />}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input with mention autocomplete */}
      <div className="px-4 py-3 flex-shrink-0 border-t border-[var(--bg-modifier-accent)] relative">
        {/* Mention dropdown */}
        {mentionOpen && (
          <div ref={mentionRef} className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--bg-modifier-accent)] z-50 discord-scrollbar">
            {/* @everyone */}
            <button
              onClick={() => {
                const atPos = newMessage.lastIndexOf('@', newMessage.length - mentionSearch.length - 1);
                const before = newMessage.substring(0, atPos);
                const after = newMessage.substring(atPos + mentionSearch.length + 1);
                setNewMessage(before + '@everyone ' + after);
                setMentionOpen(false);
                inputRef.current?.focus();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-normal)]"
            >
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                <AtSign className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="font-semibold">@everyone</p>
                <p className="text-[10px] text-[var(--text-muted)]">Notify all members</p>
              </div>
            </button>
            <div className="h-px bg-[var(--bg-modifier-accent)] mx-2" />
            {/* Users */}
            {allUsers
              .filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase()))
              .map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    const atPos = newMessage.lastIndexOf('@', newMessage.length - mentionSearch.length - 1);
                    const before = newMessage.substring(0, atPos);
                    const after = newMessage.substring(atPos + mentionSearch.length + 1);
                    setNewMessage(before + '@' + u.name + ' ' + after);
                    setMentionOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-normal)]"
                >
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{u.name}</span>
                </button>
              ))}
          </div>
        )}

        {/* Hashtag dropdown */}
        {hashOpen && (
          <div ref={hashRef} className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--bg-modifier-accent)] z-50 discord-scrollbar">
            {categories
              .filter(c => c.name.toLowerCase().includes(hashSearch.toLowerCase()))
              .map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    const hashPos = newMessage.lastIndexOf('#', newMessage.length - hashSearch.length - 1);
                    const before = newMessage.substring(0, hashPos);
                    const after = newMessage.substring(hashPos + hashSearch.length + 1);
                    setNewMessage(before + '#' + c.name + ' ' + after);
                    setHashOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-normal)]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#667eea]/20 flex items-center justify-center text-[#667eea] text-xs font-bold">
                    <span>#</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">#{c.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Forum category</p>
                  </div>
                </button>
              ))}
            {categories.filter(c => c.name.toLowerCase().includes(hashSearch.toLowerCase())).length === 0 && (
              <div className="px-3 py-2 text-sm text-[var(--text-muted)] text-center">No forum found</div>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Message #chat — type @ to mention"
            value={newMessage}
            onChange={(e) => {
              const val = e.target.value;
              setNewMessage(val);
              // Track @ for mention dropdown
              const atIndex = val.lastIndexOf('@');
              if (atIndex >= 0 && (atIndex === 0 || val[atIndex - 1] === ' ')) {
                const afterAt = val.substring(atIndex + 1);
                if (!afterAt.includes(' ')) {
                  setMentionSearch(afterAt);
                  setMentionOpen(true);
                } else {
                  setMentionOpen(false);
                }
              } else {
                setMentionOpen(false);
              }
              // Track # for hashtag dropdown
              const hashIndex = val.lastIndexOf('#');
              if (hashIndex >= 0 && (hashIndex === 0 || val[hashIndex - 1] === ' ')) {
                const afterHash = val.substring(hashIndex + 1);
                if (!afterHash.includes(' ')) {
                  setHashSearch(afterHash);
                  setHashOpen(true);
                } else {
                  setHashOpen(false);
                }
              } else {
                setHashOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setMentionOpen(false); setHashOpen(false); }
            }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-3 py-2.5 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-[var(--bg-primary)] rounded-xl p-6 w-80 shadow-2xl border border-[var(--bg-modifier-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base text-[var(--header-primary)] mb-2">Hapus Pesan</h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">Yakin ingin menghapus pesan ini? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const id = deleteConfirm;
                  setDeleteConfirm(null);
                  handleDeleteMessage(id);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Fullscreen Modal */}
      <AvatarModal
        isOpen={!!avatarTarget}
        onClose={() => setAvatarTarget(null)}
        imageUrl={avatarTarget?.avatarUrl || ""}
        userName={avatarTarget?.name || "Unknown"}
      />
    </>
  );
}
