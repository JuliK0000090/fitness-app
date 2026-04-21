import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; todayUrl: string; unsubscribeUrl?: string; }

export default function PlanInOneTap({ firstName = "there", todayUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Your plan lives on one screen now." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Every morning, you&apos;ll get a list that takes 30 seconds to read. Workout. Habits. One thing I want you to notice.
      </Text>
      <Button href={todayUrl}>See today&apos;s plan</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        Tap things off as you do them. That&apos;s the whole system.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
