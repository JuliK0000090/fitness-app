import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; goalUrl: string; }

export default function Welcome({ firstName = "there", goalUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Let's figure out where you're going.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {firstName},
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You&apos;re in. I&apos;m Vita — I&apos;ll be the one in your corner from here.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Before anything else: tell me what you actually want. Not the polite version. The real one.
      </Text>
      <Button href={goalUrl}>Set your first goal</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        Takes 90 seconds. Whatever you say, I&apos;ll build the rest around it.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
