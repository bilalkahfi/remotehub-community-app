import { getUserFromRequest } from "./auth";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export interface AdminPayload {
  userId: string;
  role: "admin" | "owner";
}

export async function getAdminFromRequest(request: NextRequest): Promise<AdminPayload | null> {
  const payload = getUserFromRequest(request);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true },
  });

  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return null;
  }

  return { userId: payload.userId, role: user.role as "admin" | "owner" };
}

export function isAdmin(role: string): boolean {
  return role === "admin" || role === "owner";
}
