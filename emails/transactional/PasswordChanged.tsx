import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; time: string; location: string; secureUrl: string; }

export default function PasswordChanged({ firstName = "there", time = "just now", location = "unknown", secureUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="If this wasn't you, act now.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your password was changed at {time} from {location}.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        If this was you, you&apos;re done. If not, lock down your account immediately.
      </Text>
      <Button href={secureUrl}>Secure my account</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
