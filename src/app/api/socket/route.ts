import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Socket.io endpoint - the actual Socket.io server runs on the HTTP server
  // This route exists so Next.js knows about /api/socket
  return NextResponse.json({
    message: "Socket.io server is running on the HTTP server",
  });
}
