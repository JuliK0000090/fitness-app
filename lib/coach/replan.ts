/**
 * Constraint-driven re-planner. Phase 1 ships a stub that records the call
 * and returns a no-op summary so the AI tool wiring works end-to-end.
 * Phase 2 replaces the body with the full validate-and-rebuild loop.
 */

import { prisma } from "../prisma";

export type ReplanResult = {
  datesUpdated: Date[];
  blocksMoved: number;
  movedDetails: Array<{
    workoutId: string;
    name: string;
    fromDate: string;
    toDate: string | null; // null if removed/auto-skipped
    reason: string;
  }>;
  summary: string;
};

export async function replanFromConstraint(
  constraintId: string,
  _options: { notify?: boolean } = {},
): Promise<ReplanResult> {
  const c = await prisma.plannerConstraint.findUnique({ where: { id: constraintId } });
  if (!c) throw new Error("Constraint not found");

  // Phase 1 stub: returns an empty plan so the chat tool flow is wired up.
  // Phase 2 swaps this for the real replanner.
  return {
    datesUpdated: [],
    blocksMoved: 0,
    movedDetails: [],
    summary: `Constraint recorded: ${c.reason}. (Re-planner activates in Phase 2.)`,
  };
}
