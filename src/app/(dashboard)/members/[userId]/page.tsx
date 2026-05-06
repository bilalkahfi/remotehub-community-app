"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MessageSquare, Edit3, Camera, User } from "lucide-react";
import { AvatarModal } from "@/components/ui/AvatarModal";
import { AdminBadge } from "@/components/ui/AdminBadge";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string | null;
  avatarUrl: string | null;
  role?: string;
  _count: {
    forumPosts: number;
    forumReplies: number;
  };
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      setProfile(data.user);
      setName(data.user.name);
      setPhone(data.user.phone);
      setBio(data.user.bio || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Merge with existing profile to preserve _count and other fields
      setProfile((prev) => prev ? { ...prev, ...data.user } : data.user);
      updateUser(data.user);
      setEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
      updateUser({ avatarUrl: data.avatarUrl });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <User className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">Profile not found</p>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 max-w-4xl">
      {/* Profile Card */}
      <div className="flex gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-white font-bold text-2xl overflow-hidden cursor-pointer"
              onClick={() => profile.avatarUrl && setAvatarModalOpen(true)}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shadow-lg">
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3 max-w-md">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--header-secondary)]">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} size="sm">
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-lg font-bold text-[var(--header-primary)] flex items-center gap-2">
                {profile.name}
                <AdminBadge role={profile.role} />
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {profile.email}
              </p>
              {profile.bio && (
                <p className="text-sm text-[var(--text-normal)] mt-3">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                <span>{profile._count.forumPosts} threads</span>
                <span>{profile._count.forumReplies} replies</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                )}
                {!isOwnProfile && currentUser && (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/messages/${userId}`)}
                    className="flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* Avatar Fullscreen Modal */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        imageUrl={profile.avatarUrl || ""}
        userName={profile.name}
      />
    </>
  );
}
