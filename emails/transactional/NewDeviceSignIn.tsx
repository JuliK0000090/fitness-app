import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; device: string; location: string; time: string; secureUrl: string; }

export default function NewDeviceSignIn({ firstName = "there", device = "Unknown device", location = "Unknown location", time = "just now", secureUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Quick check — was this you?">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Someone signed in to your Vita account just now:
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 16px" }}>
        {device} · {location} · {time}
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        If this was you, carry on. If not, secure your account now.
      </Text>
      <Button href={secureUrl}>Secure my account</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
