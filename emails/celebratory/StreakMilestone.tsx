import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; days: number; unsubscribeUrl?: string; }

export default function StreakMilestone({ firstName = "there", days = 7, unsubscribeUrl }: Props) {
  const messages: Record<number, string> = {
    7: "Seven days. That's one full week of showing up.",
    30: "Thirty days. That's the one where it stops being discipline and starts being normal.",
    60: "Sixty days. You're not doing a challenge anymore. You're just someone who does this.",
    100: "One hundred days. I don't say this lightly: that's extraordinary.",
    365: "A year. Whatever you came here for — you're still here. That matters.",
  };
  const message = messages[days] ?? `${days} days. Keep going.`;

  return (
    <Layout preview={`${days} days.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{message}</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>Keep going.</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
