import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; measureUrl: string; unsubscribeUrl?: string; }

export default function MeasurementNudge({ firstName = "there", measureUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Two minutes. That's all it takes." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Weekly measurements are due. Waist, hips, weight — whatever you track.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Two minutes now, and I&apos;ll have a trend line for you by Sunday.
      </Text>
      <Button href={measureUrl}>Log measurements</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
