"use client";

interface AdminBadgeProps {
  role?: string | null;
  size?: "sm" | "xs";
}

export function AdminBadge({ role, size = "sm" }: AdminBadgeProps) {
  if (!role || (role !== "admin" && role !== "owner")) return null;

  const isOwner = role === "owner";

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full
        ${isOwner ? "bg-yellow-500/20 text-yellow-400" : "bg-accent/20 text-accent"}
        ${size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"}
      `}
      title={isOwner ? "Owner" : "Admin"}
    >
      {isOwner ? "OWNER" : "ADMIN"}
    </span>
  );
}
