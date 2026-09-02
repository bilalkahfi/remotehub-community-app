import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, type JwtPayload } from "@/lib/auth";
import { getPairContext, type PairContext } from "./pair";

export type GuardResult<T> = { data: T; response: null } | { data: null; response: NextResponse };

export function requireUser(request: NextRequest): GuardResult<JwtPayload> {
  const payload = getUserFromRequest(request);
  if (!payload) {
    return {
      data: null,
      response: NextResponse.json({ error: "Belum login" }, { status: 401 }),
    };
  }
  return { data: payload, response: null };
}

export interface PairedContext extends PairContext {
  userId: string;
}

/** Semua endpoint chat butuh user yang udah login DAN udah punya pasangan. */
export async function requirePair(
  request: NextRequest
): Promise<GuardResult<PairedContext>> {
  const auth = requireUser(request);
  if (auth.response) return { data: null, response: auth.response };

  const ctx = await getPairContext(auth.data.userId);
  if (!ctx) {
    return {
      data: null,
      response: NextResponse.json(
        { error: "Belum punya pasangan", code: "NO_PAIR" },
        { status: 404 }
      ),
    };
  }

  return { data: { ...ctx, userId: auth.data.userId }, response: null };
}
