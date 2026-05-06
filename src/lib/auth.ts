import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Fallback: check cookie
  const cookies = request.cookies.get("token")?.value;
  return cookies || null;
}

export function getUserFromRequest(
  request: NextRequest
): JwtPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(
  request: NextRequest
): { user: JwtPayload; error: Response } | { user: null; error: Response } {
  const user = getUserFromRequest(request);
  if (!user) {
    return {
      user: null,
      error: Response.json(
        { error: "Unauthorized - please login" },
        { status: 401 }
      ),
    };
  }
  return { user, error: null as unknown as Response };
}
