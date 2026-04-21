import { Text, Hr } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props {
  firstName: string;
  month: string;
  workoutsDone: number;
  workoutsPlanned: number;
  adherencePct: number;
  weightDelta: string;
  waistDelta: string;
  biggestWin: string;
  aiReflection: string;
  reportUrl: string;
  unsubscribeUrl?: string;
}

export default function MonthlyReport({
  firstName = "there",
  month = "last month",
  workoutsDone = 0,
  workoutsPlanned = 0,
  adherencePct = 0,
  weightDelta = "—",
  waistDelta = "—",
  biggestWin = "",
  aiReflection = "",
  reportUrl = "https://example.com",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview={`${month} — ${adherencePct}% adherence. Honest reflection inside.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {month} is done. Here&apos;s what the numbers say:
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>This month</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 4px" }}>· {workoutsDone}/{workoutsPlanned} workouts</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 4px" }}>· {adherencePct}% habit adherence</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>· Weight: {weightDelta} · Waist: {waistDelta}</Text>
      {biggestWin && (
        <>
          <Hr style={{ borderColor: "#E8E6E0", margin: "16px 0" }} />
          <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>Biggest win</Text>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{biggestWin}</Text>
        </>
      )}
      {aiReflection && (
        <>
          <Hr style={{ borderColor: "#E8E6E0", margin: "16px 0" }} />
          <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>What I noticed</Text>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{aiReflection}</Text>
        </>
      )}
      <Button href={reportUrl}>See the full report</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
