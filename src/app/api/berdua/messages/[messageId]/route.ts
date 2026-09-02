import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePair } from "@/lib/berdua/guard";
import { syncRemindersFor } from "@/lib/berdua/reminders";

const patchSchema = z.object({
  needsReply: z.boolean().optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
});

/** Cuma pengirim yang boleh ngubah status "butuh dibales" pesannya sendiri. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const guard = await requirePair(request);
  if (guard.response) return guard.response;
  const ctx = guard.data;

  try {
    const data = patchSchema.parse(await request.json());

    const message = await prisma.pairMessage.findUnique({ where: { id: params.messageId } });
    if (!message || message.pairId !== ctx.pair.id) {
      return NextResponse.json({ error: "Pesan gak ketemu" }, { status: 404 });
    }
    if (message.senderId !== ctx.userId) {
      return NextResponse.json(
        { error: "Cuma pengirim yang bisa ngubah pesan ini" },
        { status: 403 }
      );
    }

    const updated = await prisma.pairMessage.update({
      where: { id: message.id },
      data,
    });

    if (ctx.partner) {
      await syncRemindersFor(ctx.pair.id, ctx.partner.userId);
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update pesan berdua error:", error);
    return NextResponse.json({ error: "Gagal ngubah pesan" }, { status: 500 });
  }
}
