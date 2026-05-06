"use client";

import { useEffect, useState, useRef, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { AvatarModal } from "@/components/ui/AvatarModal";

interface MessageUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: MessageUser;
  receiver: MessageUser;
  read: boolean;
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<MessageUser | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    const container = document.querySelector('.messages-scroll-container');
    if (!container) return;
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  };

  const isNearBottom = () => {
    const el = document.querySelector('.messages-scroll-container');
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
  };

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0) {
          setOtherUser(
            data.messages[0].sender.id === user?.id
              ? data.messages[0].receiver
              : data.messages[0].sender
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, fetchMessages]);

  // Auto-scroll only when new messages arrive AND user is near bottom
  // Uses useEffect to run AFTER React re-renders (not during fetch)
  useEffect(() => {
    if (!loading && isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // Poll for new messages every 5 seconds (fallback when socket.io not available)
  useEffect(() => {
    if (!user) return;
    
    pollRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchMessages]);

  // Get other user info if no messages yet
  useEffect(() => {
    if (messages.length === 0 && !loading && user) {
      fetch(`/api/users/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setOtherUser(data.user);
        })
        .catch(console.error);
    }
  }, [messages, loading, userId, user]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/messages/${userId}`, {
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
      scrollToBottom();
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "";
    if (days === 1) return "Yesterday ";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " ";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--bg-modifier-accent)] flex-shrink-0">
        <div
          className="relative w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => otherUser?.avatarUrl && setAvatarModalOpen(true)}
        >
          {otherUser?.avatarUrl ? (
            <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            otherUser?.name?.charAt(0).toUpperCase() || "?"
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-primary)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--header-primary)]">
            {otherUser?.name || "Loading..."}
          </h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 discord-scrollbar messages-scroll-container min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send the first message!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, idx) => {
              const isMine = msg.sender.id === user?.id;
              const showDate = idx === 0 || formatDateHeader(msg.createdAt) !== formatDateHeader(messages[idx - 1]?.createdAt);

              return (
                <div key={msg.id}>
                  {showDate && formatDateHeader(msg.createdAt) && (
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-[var(--bg-modifier-accent)]" />
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{formatDateHeader(msg.createdAt)}</span>
                      <div className="flex-1 h-px bg-[var(--bg-modifier-accent)]" />
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isMine ? "bg-[#5865f2] dark:bg-[#4752c4] text-white" : "bg-[#e8e8eb] dark:bg-[#383a40] text-[#1e1f22] dark:text-[#dbdee1] border border-[#d0d4d9] dark:border-[#4e5058]"}`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? "text-white/60" : "text-[var(--text-muted)]"}`}>
                        <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M3.5 6.5L5 8l3.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Avatar Fullscreen Modal */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        imageUrl={otherUser?.avatarUrl || ""}
        userName={otherUser?.name || "Unknown"}
      />

      {/* Input */}
      <div className="px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Message ${otherUser?.name || "user"}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} className="px-3">
            {sending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
