import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { coachingFunctions } from "@/lib/jobs/coaching";
import { ledgerFunctions } from "@/lib/jobs/ledger";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...coachingFunctions, ...ledgerFunctions],
});
