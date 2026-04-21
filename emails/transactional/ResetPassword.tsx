import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; resetUrl: string; }

export default function ResetPassword({ firstName = "there", resetUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Link expires in one hour.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Tap below to set a new password. Link works for the next hour.
      </Text>
      <Button href={resetUrl}>Reset password</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        If this wasn&apos;t you, ignore this email and your password stays as it was.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
