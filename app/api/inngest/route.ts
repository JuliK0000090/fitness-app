import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { coachingFunctions } from "@/lib/jobs/coaching";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: coachingFunctions,
});
