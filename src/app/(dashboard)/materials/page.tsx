"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, FileText, Image, Film, Upload, Trash2, Download, File, Plus, X, Play, Edit3 } from "lucide-react";

interface Material {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  uploader: { id: string; name: string };
}

const fileTypeIcons: Record<string, any> = {
  pdf: FileText,
  image: Image,
  video: Play,
  word: FileText,
};

const fileTypeColors: Record<string, string> = {
  pdf: "text-red-400",
  image: "text-green-400",
  video: "text-purple-400",
  word: "text-blue-400",
};

function getYouTubeEmbed(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function isGoogleDrive(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export default function MaterialsPage() {
  const { user, loading } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Material | null>(null);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userRole = (user as any)?.role;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { if (!loading) fetchMaterials(); }, [loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !fileUrl || !fileName) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, fileUrl, fileType, fileName, fileSize: 0 }),
      });
      if (res.ok) {
        setShowForm(false); setTitle(""); setDescription(""); setFileUrl(""); setFileName("");
        fetchMaterials();
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !title) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editing.id, title, description }),
      });
      if (res.ok) {
        setEditing(null);
        fetchMaterials();
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/materials?id=${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (viewing?.id === id) setViewing(null);
      fetchMaterials();
    } catch (err) { console.error(err); }
  };

  if (fetchLoading || loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  }

  // Auto-detect file type from URL
  const getDetectedType = (url: string, selectedType: string): string => {
    if (getYouTubeEmbed(url)) return "video";
    if (isImageUrl(url)) return "image";
    if (isVideoUrl(url)) return "video";
    if (isPdfUrl(url)) return "pdf";
    return selectedType;
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--header-primary)]">Materi</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Materi seputar mencari kerja remote untuk anggota komunitas
          </p>
        </div>
        {isAdminOrOwner && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 flex-shrink-0 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> {showForm ? "Batal" : "Tambah Materi"}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--bg-modifier-accent)] space-y-3">
          <input type="text" placeholder="Judul materi" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]" />
          <textarea placeholder="Deskripsi (opsional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-none" />
          <div className="flex gap-2">
            <select value={fileType} onChange={(e) => setFileType(e.target.value)}
              className="px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none">
              <option value="pdf">PDF</option>
              <option value="image">Gambar</option>
              <option value="video">Video</option>
              <option value="word">Word</option>
            </select>
            <input type="text" placeholder="Nama file (contoh: panduan-cv.pdf)" value={fileName} onChange={(e) => setFileName(e.target.value)} required
              className="flex-1 px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]" />
          </div>
          <input type="url" placeholder="URL file (YouTube, Google Drive, atau link langsung)" value={fileUrl} onChange={(e) => {
            setFileUrl(e.target.value);
            // Auto-detect video type for YouTube
            if (getYouTubeEmbed(e.target.value)) setFileType("video");
          }} required
            className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]" />
          <div className="flex justify-end">
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all">
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Belum ada materi</p>
          {isAdminOrOwner && <p className="text-xs text-[var(--text-muted)] mt-1">Klik "Tambah Materi" untuk mulai</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          {materials.map((mat) => {
            const Icon = fileTypeIcons[mat.fileType] || File;
            const color = fileTypeColors[mat.fileType] || "text-[var(--text-muted)]";
            const isYouTube = !!getYouTubeEmbed(mat.fileUrl);
            return (
              <div key={mat.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--bg-modifier-accent)] hover:border-accent/20 transition-all group">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex sm:hidden w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setViewing(mat)}
                        className="font-semibold text-sm text-[var(--header-primary)] hover:text-accent transition-colors truncate block text-left w-full">
                        {mat.title}
                      </button>
                      {mat.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{mat.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-[10px] text-[var(--text-muted)]">{mat.uploader.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{mat.fileType.toUpperCase()}</span>
                        {isYouTube && <span className="text-[10px] text-red-400">YouTube</span>}
                        <span className="text-[10px] text-[var(--text-muted)]">{new Date(mat.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-start ml-auto">
                  <button onClick={() => setViewing(mat)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-accent transition-colors" title="Lihat">
                    <Play className="w-4 h-4" />
                  </button>
                  <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-accent transition-colors" title="Buka di tab baru">
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdminOrOwner && (
                    <>
                    <button onClick={() => { setEditing(mat); setTitle(mat.title); setDescription(mat.description || ""); }}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-accent transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeletingId(mat.id)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl p-6 shadow-2xl border border-[var(--bg-modifier-accent)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[var(--header-primary)]">Edit Materi</h3>
              <button onClick={() => setEditing(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <input type="text" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} required
                className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)]" />
              <textarea placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded bg-[var(--bg-tertiary)] text-sm text-[var(--text-normal)] border border-[var(--bg-modifier-accent)] focus:outline-none focus:border-accent placeholder-[var(--text-muted)] resize-none" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)}
                  className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-1.5 text-sm rounded bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-all">{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setDeletingId(null)}>
          <div className="bg-[var(--bg-primary)] rounded-xl p-6 w-80 shadow-2xl border border-[var(--bg-modifier-accent)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-base text-[var(--header-primary)] mb-2">Hapus Materi</h3>
            <p className="text-sm text-[var(--text-muted)] mb-5">Yakin ingin menghapus materi ini? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">Batal</button>
              <button onClick={() => { const id = deletingId; setDeletingId(null); handleDelete(id); }}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Material Viewer Modal */}
      {viewing && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-primary)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--bg-modifier-accent)]" onClick={(e) => e.stopPropagation()}>
            
            {/* Close button */}
            <button onClick={() => setViewing(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="p-4 border-b border-[var(--bg-modifier-accent)]">
              <h2 className="font-semibold text-sm text-[var(--header-primary)] truncate pr-8">{viewing.title}</h2>
              {viewing.description && <p className="text-xs text-[var(--text-muted)] mt-1">{viewing.description}</p>}
            </div>

            {/* Content - responsive embed */}
            <div className="p-4 flex items-center justify-center min-h-[300px] md:min-h-[400px] bg-black/5">
              {(() => {
                const ytEmbed = getYouTubeEmbed(viewing.fileUrl);
                const gdEmbed = isGoogleDrive(viewing.fileUrl);

                if (ytEmbed) {
                  return (
                    <div className="w-full" style={{ position: 'relative', paddingBottom: '56.25%' }}>
                      <iframe
                        src={ytEmbed}
                        title={viewing.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    </div>
                  );
                }

                if (gdEmbed) {
                  return (
                    <div className="w-full" style={{ position: 'relative', paddingBottom: '56.25%' }}>
                      <iframe
                        src={gdEmbed}
                        title={viewing.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        className="rounded-lg"
                      />
                    </div>
                  );
                }

                if (viewing.fileType === "image" || isImageUrl(viewing.fileUrl)) {
                  return <img src={viewing.fileUrl} alt={viewing.title} className="max-w-full max-h-[70vh] rounded-lg object-contain" />;
                }

                if (viewing.fileType === "video" || isVideoUrl(viewing.fileUrl)) {
                  return (
                    <video controls className="max-w-full max-h-[70vh] rounded-lg" controlsList="nodownload">
                      <source src={viewing.fileUrl} />
                    </video>
                  );
                }

                if (viewing.fileType === "pdf" || isPdfUrl(viewing.fileUrl)) {
                  return (
                    <div className="w-full text-center">
                      <iframe
                        src={`${viewing.fileUrl}#toolbar=0`}
                        title={viewing.title}
                        className="w-full rounded-lg"
                        style={{ height: '70vh' }}
                      />
                    </div>
                  );
                }

                // Fallback: show link
                return (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-muted)] mb-2">Pratinjau tidak tersedia untuk file ini</p>
                    <a href={viewing.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm hover:opacity-90 transition-all">
                      <Download className="w-4 h-4" /> Buka File
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
