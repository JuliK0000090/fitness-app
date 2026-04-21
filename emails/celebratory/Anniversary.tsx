import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; years: number; unsubscribeUrl?: string; }

export default function Anniversary({ firstName = "there", years = 1, unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${years} year${years !== 1 ? "s" : ""} with Vita.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {years} year{years !== 1 ? "s" : ""} today. That&apos;s not nothing.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You&apos;ve logged workouts, taken photos, hit goals and missed some. That&apos;s what a real year looks like.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Here&apos;s to the next one.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
