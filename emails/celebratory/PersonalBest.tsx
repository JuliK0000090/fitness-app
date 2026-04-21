import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; metric: string; value: string; previousBest: string; unsubscribeUrl?: string; }

export default function PersonalBest({ firstName = "there", metric = "1-mile run", value = "8:00", previousBest = "8:30", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`New personal best: ${metric}.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        New personal best — {metric}: {value}. Previous best was {previousBest}.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        That&apos;s not luck. That&apos;s the work showing up.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
