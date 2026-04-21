import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; streakDays: number; todayUrl: string; unsubscribeUrl?: string; }

export default function ThreeDayStreak({ firstName = "there", streakDays = 3, todayUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${streakDays} days in a row. Keep it going.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {streakDays} days in a row. That&apos;s the hardest part — you&apos;re already past it.
      </Text>
      <Button href={todayUrl}>Keep going</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
