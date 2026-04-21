import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; newEmail: string; revokeUrl: string; }

export default function EmailChanged({ firstName = "there", newEmail = "new@example.com", revokeUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Sent to your previous address, too.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your account email was just changed to {newEmail}. This confirmation is going to both addresses.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        If this wasn&apos;t you, you have 24 hours to revoke the change.
      </Text>
      <Button href={revokeUrl}>Revoke the change</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
