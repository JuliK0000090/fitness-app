import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props {
  firstName: string;
  tooBusyUrl: string;
  wrongPlanUrl: string;
  notReadyUrl: string;
  otherUrl: string;
  unsubscribeUrl?: string;
}

export default function Winback({
  firstName = "there",
  tooBusyUrl = "https://example.com",
  wrongPlanUrl = "https://example.com",
  notReadyUrl = "https://example.com",
  otherUrl = "https://example.com",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview="Honest answers only." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        It&apos;s been a month. I&apos;d rather know the real reason than guess.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Was it too much? Wrong approach? Life got in the way? Something I could have done differently?
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        One tap, one word is fine.
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 16px" }}>
        <a href={tooBusyUrl} style={{ color: "#1A1A1A", marginRight: 16 }}>Too busy</a>
        <a href={wrongPlanUrl} style={{ color: "#1A1A1A", marginRight: 16 }}>Wrong plan</a>
        <a href={notReadyUrl} style={{ color: "#1A1A1A", marginRight: 16 }}>Not ready</a>
        <a href={otherUrl} style={{ color: "#1A1A1A" }}>Other</a>
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 16px" }}>
        Whatever you pick, your data stays safe and the door stays open.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
