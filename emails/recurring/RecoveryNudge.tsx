import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props {
  firstName: string;
  hrvDropPct: number;
  sleepHours: number;
  originalWorkout: string;
  newWorkout: string;
  acceptUrl: string;
  keepUrl: string;
  unsubscribeUrl?: string;
}

export default function RecoveryNudge({
  firstName = "there",
  hrvDropPct = 20,
  sleepHours = 5,
  originalWorkout = "Strength",
  newWorkout = "Mobility",
  acceptUrl = "https://example.com",
  keepUrl = "https://example.com",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview="Your body's asking for it." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your HRV dropped {hrvDropPct}% and you got {sleepHours}h of sleep. I wouldn&apos;t push intensity today.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        I&apos;ve swapped {originalWorkout} for {newWorkout}. Sound right?
      </Text>
      <Button href={acceptUrl}>Accept</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "8px 0 0" }}>
        <a href={keepUrl} style={{ color: "#6B6B6B" }}>No, keep original</a>
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
