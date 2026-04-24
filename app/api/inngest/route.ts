import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { coachingFunctions } from "@/lib/jobs/coaching";
import { ledgerFunctions } from "@/lib/jobs/ledger";
import { healthIngestFunctions } from "@/lib/jobs/health-ingest";
import { runReactiveAdjustments } from "@/lib/jobs/reactive-adjust";
import { runInsightMoments } from "@/lib/jobs/insights";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...coachingFunctions,
    ...ledgerFunctions,
    ...healthIngestFunctions,
    runReactiveAdjustments,
    runInsightMoments,
  ],
});
