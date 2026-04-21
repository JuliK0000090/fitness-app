import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; uploadUrl: string; daysSinceLast: number; unsubscribeUrl?: string; }

export default function PhotoNudge({ firstName = "there", uploadUrl = "https://example.com", daysSinceLast = 14, unsubscribeUrl }: Props) {
  return (
    <Layout preview="Progress photos are the ones you'll be glad you took." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        It&apos;s been {daysSinceLast} days since your last progress photo.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Same spot, same light, same pose. Two minutes and you&apos;re done.
      </Text>
      <Button href={uploadUrl}>Take a photo</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
