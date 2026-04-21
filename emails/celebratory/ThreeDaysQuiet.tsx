import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; todayUrl: string; unsubscribeUrl?: string; }

export default function ThreeDaysQuiet({ firstName = "there", todayUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Still here when you're ready." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Three quiet days. No judgment — sometimes that&apos;s what the body needs.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        When you&apos;re ready, today&apos;s plan is waiting.
      </Text>
      <Button href={todayUrl}>Today&apos;s plan</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
