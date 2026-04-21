import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; uploadUrl: string; unsubscribeUrl?: string; }

export default function FirstProgressPhoto({ firstName = "there", uploadUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="You'll be glad you took it." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        I need one photo. Front-on, good light, something fitted or swim. It&apos;s just for you — I&apos;ll never show it to anyone, and you can delete it any time.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        The reason: in six weeks, you&apos;ll want a before. Take it now while the before is still accurate.
      </Text>
      <Button href={uploadUrl}>Upload your baseline</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
