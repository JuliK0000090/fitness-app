import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; workoutCount: number; adherencePct: number; feedbackUrl: string; unsubscribeUrl?: string; }

export default function OneWeekIn({ firstName = "there", workoutCount = 0, adherencePct = 0, feedbackUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview="What's working, what's not." unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You&apos;ve logged {workoutCount} workouts and hit your checklist {adherencePct}% of days. That&apos;s a real start.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        One ask: what&apos;s feeling off? Too much? Too little? Wrong type of training?
      </Text>
      <Button href={feedbackUrl}>Tell me</Button>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "16px 0 0" }}>
        I&apos;d rather change the plan now than pretend it&apos;s perfect.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
