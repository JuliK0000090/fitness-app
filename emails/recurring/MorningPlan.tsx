import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props {
  firstName: string;
  workoutName: string;
  duration: number;
  habit1: string;
  habit2: string;
  habit3: string;
  stepsGoal: number;
  oneLineNote: string;
  todayUrl: string;
  unsubscribeUrl?: string;
}

export default function MorningPlan({
  firstName = "there",
  workoutName = "Rest day",
  duration = 0,
  habit1 = "Drink water",
  habit2 = "10 min walk",
  habit3 = "Sleep by 10pm",
  stepsGoal = 8000,
  oneLineNote = "You've got this.",
  todayUrl = "https://example.com",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview={`${workoutName}${duration ? `, ${duration} min` : ""} · ${habit1} · ${habit2}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 4px" }}>Workout</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {workoutName}{duration ? `, ${duration} min` : ""}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 4px" }}>Habits</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {habit1} · {habit2} · {habit3}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 4px" }}>Steps goal</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {stepsGoal.toLocaleString()}
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", fontStyle: "italic", margin: "0 0 16px" }}>
        {oneLineNote}
      </Text>
      <Button href={todayUrl}>Open today</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
