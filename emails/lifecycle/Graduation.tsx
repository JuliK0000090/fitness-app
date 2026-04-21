import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; unsubscribeUrl?: string; }

export default function Graduation({ firstName = "there", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Two weeks in. Here's the rest." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Two weeks. You&apos;ve got the rhythm. Before I go quieter, three things most people miss:
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 8px" }}>
        1. The weekly review on Sunday — don&apos;t skip it, that&apos;s where the plan actually changes.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 8px" }}>
        2. Measurements beat photos beat scale weight. In that order.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        3. If a day goes sideways, the next day is the real test. Not the scale.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        I&apos;ll keep the mornings short from here.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
