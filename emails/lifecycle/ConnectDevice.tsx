import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; connectUrl: string; unsubscribeUrl?: string; }

export default function ConnectDevice({ firstName = "there", connectUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Oura, Whoop, Apple Watch — one tap each." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        If you wear anything — Oura, Whoop, Apple Watch, Garmin, Fitbit — connect it now and I&apos;ll stop asking you to log things manually.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Sleep, heart rate, steps, recovery. All of it. Automatic.
      </Text>
      <Button href={connectUrl}>Connect a device</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
