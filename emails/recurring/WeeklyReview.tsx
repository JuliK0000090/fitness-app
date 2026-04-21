import { Text, Hr } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props {
  firstName: string;
  workoutsDone: number;
  workoutsPlanned: number;
  adherencePct: number;
  weightDelta: string;
  waistDelta: string;
  aiObservation: string;
  planChange: string;
  reviewUrl: string;
  unsubscribeUrl?: string;
}

export default function WeeklyReview({
  firstName = "there",
  workoutsDone = 0,
  workoutsPlanned = 0,
  adherencePct = 0,
  weightDelta = "—",
  waistDelta = "—",
  aiObservation = "",
  planChange = "",
  reviewUrl = "https://example.com",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview={`Adherence ${adherencePct}%. One thing I noticed.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>This week</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 4px" }}>· {workoutsDone}/{workoutsPlanned} workouts</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 4px" }}>· {adherencePct}% of habits</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>· Weight: {weightDelta} · Waist: {waistDelta}</Text>
      <Hr style={{ borderColor: "#E8E6E0", margin: "16px 0" }} />
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>What I noticed</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{aiObservation}</Text>
      {planChange && (
        <>
          <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>Next week</Text>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{planChange}</Text>
        </>
      )}
      <Button href={reviewUrl}>See the full review</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
