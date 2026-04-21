import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; verifyUrl: string; }

export default function VerifyEmail({ firstName = "there", verifyUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="One tap and we're in.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Hi {firstName},
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Tap the button below to confirm this is you. The link works for 24 hours.
      </Text>
      <Button href={verifyUrl}>Confirm email</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        If you didn&apos;t sign up for Vita, you can ignore this — the account won&apos;t activate without this confirmation.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
