import { redirect } from "next/navigation";

/**
 * Spec alias for /dev/calendar-test, which already implements the 9-scenario
 * visual verification (covering the spec's 6 + 3 extras: future-DONE data
 * bug, future-AUTO_SKIPPED data bug, future-MOVED).
 */
export default function CalendarVerifyAlias() {
  redirect("/dev/calendar-test");
}
