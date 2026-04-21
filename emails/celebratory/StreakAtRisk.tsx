import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; streakDays: number; logUrl: string; unsubscribeUrl?: string; }

export default function StreakAtRisk({ firstName = "there", streakDays = 1, logUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Two hours left. Five minutes is enough." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Two hours left in the day and nothing logged. Your {streakDays}-day streak is still live.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Five minutes of stretching counts. So does a walk. So does a measurement.
      </Text>
      <Button href={logUrl}>Log something</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
