import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { inngest } from "@/lib/inngest";

export async function POST() {
  const session = await requireSession();

  await inngest.send({
    name: "vita/checklist.generate",
    data: { userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
