import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; downloadUrl: string; size: string; }

export default function DataExportReady({ firstName = "there", downloadUrl = "https://example.com", size = "unknown" }: Props) {
  return (
    <Layout preview="Link expires in 7 days.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your Vita export — everything you&apos;ve ever logged — is ready.
      </Text>
      <Button href={downloadUrl}>Download ({size})</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        The link is yours for the next 7 days, then it&apos;s gone.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
