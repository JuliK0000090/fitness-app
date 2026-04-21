import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; settingsUrl: string; unsubscribeUrl?: string; }

export default function QuieterMornings({ firstName = "there", settingsUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="You're in control of how often I show up." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Ten days in. If I&apos;m showing up too often — or not enough — you can adjust exactly how and when I reach out.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Morning plans, evening previews, weekly reviews — all configurable.
      </Text>
      <Button href={settingsUrl}>Adjust my notifications</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
