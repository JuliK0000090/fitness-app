import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; goalDescription: string; nextGoalUrl: string; unsubscribeUrl?: string; }

export default function GoalReached({ firstName = "there", goalDescription = "your goal", nextGoalUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${goalDescription} — done.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {goalDescription} — done.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        You said you would and you did. I want to remember this moment with you, because the next goal starts feeling possible the second this one closes.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>What&apos;s next?</Text>
      <Button href={nextGoalUrl}>Set the next one</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
