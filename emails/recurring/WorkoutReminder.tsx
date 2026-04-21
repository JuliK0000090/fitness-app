import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; workoutName: string; startsIn: string; workoutUrl: string; unsubscribeUrl?: string; }

export default function WorkoutReminder({ firstName = "there", workoutName = "Workout", startsIn = "30 minutes", workoutUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`${workoutName} in ${startsIn}.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {workoutName} in {startsIn}. Time to get ready.
      </Text>
      <Button href={workoutUrl}>Open workout</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
