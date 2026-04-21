import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; keepPlanUrl: string; freshStartUrl: string; unsubscribeUrl?: string; }

export default function WelcomeBack({ firstName = "there", keepPlanUrl = "https://example.com", freshStartUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="I kept your data safe." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You&apos;re back. Everything&apos;s exactly how you left it.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Want to keep the old plan or start fresh?
      </Text>
      <Button href={keepPlanUrl}>Keep the plan</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "8px 0 0" }}>
        <a href={freshStartUrl} style={{ color: "#6B6B6B" }}>Start fresh</a>
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
