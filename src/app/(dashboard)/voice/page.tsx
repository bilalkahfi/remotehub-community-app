"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Mic, Plus, Volume2 } from "lucide-react";

interface VoiceRoom {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function VoicePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/voice/rooms");
      const data = await res.json();
      setRooms(data.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/voice/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roomName }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const data = await res.json();
      setRoomName("");
      setShowCreate(false);
      fetchRooms();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="p-6">
      {/* New Room Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-[var(--interactive-normal)] hover:bg-[var(--bg-hover)] hover:text-[var(--interactive-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showCreate ? "Cancel" : "New Room"}
        </button>
      </div>

      {/* Create Room Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-modifier-accent)] space-y-3 max-w-md"
        >
          <input
            type="text"
            placeholder="Room name..."
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" loading={creating} size="sm">
              Create Room
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Mic className="w-10 h-10 mx-auto mb-3" />
          <p className="text-sm">No voice rooms yet</p>
          <p className="text-xs mt-1">Create a room and invite others!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[var(--text-normal)] truncate group-hover:text-[var(--interactive-hover)]">
                  {room.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-muted)]">
                  <span>Created by {room.creator.name}</span>
                  <span>· {formatDate(room.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push(`/voice/${room.id}`)}
                >
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
