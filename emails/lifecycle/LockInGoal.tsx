import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; goalUrl: string; unsubscribeUrl?: string; }

export default function LockInGoal({ firstName = "there", goalUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="The version you tell friends, not the polite one." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        I noticed you haven&apos;t set a goal yet. That&apos;s fine — most people write three before they mean one.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Just tell me the real thing. &quot;Shrink my waist 3 cm by July.&quot; &quot;Finally do the splits.&quot; Whatever it actually is.
      </Text>
      <Button href={goalUrl}>Write it down</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        Once it&apos;s there, I&apos;ll build everything else around it.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
