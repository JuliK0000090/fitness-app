import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; metric: string; change: string; unsubscribeUrl?: string; }

export default function MeasurementWin({ firstName = "there", metric = "waist", change = "2cm", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${metric} is moving.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your {metric} is down {change} since you started tracking. The tape measure doesn&apos;t lie.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Keep going.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
