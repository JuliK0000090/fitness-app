import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; comeBackUrl: string; unsubscribeUrl?: string; }

export default function FourteenDaysDormant({ firstName = "there", comeBackUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="No pressure. Just a note." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You haven&apos;t been back in two weeks. I didn&apos;t want to chase — but I also didn&apos;t want you to think I&apos;d forgotten.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your data&apos;s where you left it. Your goals are paused, not gone. Whenever you come back, we pick up from wherever makes sense.
      </Text>
      <Button href={comeBackUrl}>Come back</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
