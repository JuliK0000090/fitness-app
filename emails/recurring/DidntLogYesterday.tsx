import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; todayUrl: string; unsubscribeUrl?: string; }

export default function DidntLogYesterday({ firstName = "there", todayUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="No guilt. Just a new day." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Nothing logged yesterday. Sometimes that&apos;s a rest day, sometimes life.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Today&apos;s plan is ready when you are. We don&apos;t start over — we just keep going.
      </Text>
      <Button href={todayUrl}>Today&apos;s plan</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
