import { Text, Section, Button } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props {
  partnerName: string;
  userFirstName: string;
  workoutsDone: number;
  workoutsPlanned: number;
  habitAdherencePct: number;
  streakDays: number;
  streakAlive: boolean;
  notable: string | null;     // one-line narrative; null if "quiet week"
  encourageUrl: string;
  unsubscribeUrl?: string;
}

export default function WeeklySummary({
  partnerName = "friend",
  userFirstName = "your friend",
  workoutsDone = 0,
  workoutsPlanned = 0,
  habitAdherencePct = 0,
  streakDays = 0,
  streakAlive = false,
  notable = null,
  encourageUrl = "https://example.com/partner/encourage/...",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview={`${userFirstName}'s week.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Hi {partnerName},
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {userFirstName}'s week:
      </Text>

      <Text style={{ fontSize: 15, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 8px" }}>
        — {workoutsDone} of {workoutsPlanned} workouts done
      </Text>
      <Text style={{ fontSize: 15, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 8px" }}>
        — {habitAdherencePct}% of habits stuck with
      </Text>
      <Text style={{ fontSize: 15, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        — {streakDays}-day streak {streakAlive ? "alive" : "reset"}
      </Text>

      {notable && (
        <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "16px 0", fontStyle: "italic" }}>
          {notable}
        </Text>
      )}

      <Section style={{ margin: "24px 0" }}>
        <Button
          href={encourageUrl}
          style={{
            backgroundColor: "#D4C4A8",
            color: "#1A1A1A",
            padding: "12px 24px",
            borderRadius: "4px",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Send a one-line note
        </Button>
      </Section>

      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#666", margin: "16px 0" }}>
        It'll land in {userFirstName}'s app.
      </Text>

      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>
        — Vita
      </Text>
    </Layout>
  );
}
