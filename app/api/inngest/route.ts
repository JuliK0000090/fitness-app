import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { coachingFunctions } from "@/lib/jobs/coaching";
import { ledgerFunctions } from "@/lib/jobs/ledger";
import { healthIngestFunctions } from "@/lib/jobs/health-ingest";
import { runReactiveAdjustments } from "@/lib/jobs/reactive-adjust";
import { runInsightMoments } from "@/lib/jobs/insights";
import { decayMemoryConfidence } from "@/lib/jobs/memory-decay";
import { rolloverFunctions } from "@/lib/jobs/rollover";
import { integrityFunctions } from "@/lib/jobs/integrity";
import { notificationFunctions } from "@/lib/jobs/notifications";
import { partnerJobs } from "@/lib/jobs/partner";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...coachingFunctions,
    ...ledgerFunctions,
    ...healthIngestFunctions,
    ...rolloverFunctions,
    ...integrityFunctions,
    ...notificationFunctions,
    ...partnerJobs,
    runReactiveAdjustments,
    runInsightMoments,
    decayMemoryConfidence,
  ],
});
