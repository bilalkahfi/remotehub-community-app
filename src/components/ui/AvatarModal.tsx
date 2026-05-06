"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  userName: string;
}

export function AvatarModal({ isOpen, onClose, imageUrl, userName }: AvatarModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`${userName}'s profile photo`}
          className="w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain"
        />
      </div>

      {/* User name */}
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
        {userName}
      </p>
    </div>
  );
}
