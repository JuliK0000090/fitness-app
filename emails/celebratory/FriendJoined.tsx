import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; friendName: string; unsubscribeUrl?: string; }

export default function FriendJoined({ firstName = "there", friendName = "your friend", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${friendName} just joined Vita.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {friendName} just joined Vita. You&apos;re already ahead by a few steps.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        No pressure to compete — but knowing someone else is in it usually helps.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
