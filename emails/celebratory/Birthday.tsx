import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; unsubscribeUrl?: string; }

export default function Birthday({ firstName = "there", unsubscribeUrl }: Props) {
  return (
    <Layout preview="Not a sales email. I promise." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Happy birthday. I&apos;m glad you&apos;re here.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        No plan today unless you want one. Enjoy the day.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
