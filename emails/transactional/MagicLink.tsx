import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { signInUrl: string; }

export default function MagicLink({ signInUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Valid for 15 minutes.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Tap to sign in:
      </Text>
      <Button href={signInUrl}>Sign in to Vita</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        Expires in 15 minutes. If you didn&apos;t request this, ignore it.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
