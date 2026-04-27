import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { regenerateUserPlan } from "@/lib/coach/regenerate";

/**
 * Manual "Regenerate plan" trigger from the settings page. Idempotent —
 * the user can hit this any time without creating duplicates.
 */
export async function POST() {
  const session = await requireSession();
  const result = await regenerateUserPlan(session.userId);
  return NextResponse.json(result);
}
