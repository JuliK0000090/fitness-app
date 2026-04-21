import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; tomorrowWorkout: string; duration: number; todayUrl: string; unsubscribeUrl?: string; }

export default function EveningPreview({ firstName = "there", tomorrowWorkout = "Rest day", duration = 0, todayUrl = "https://example.com", unsubscribeUrl }: Props) {
  return (
    <Layout preview={`Tomorrow: ${tomorrowWorkout}${duration ? `, ${duration} min` : ""}`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Tomorrow: {tomorrowWorkout}{duration ? `, ${duration} min` : ""}.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Get to bed on time and it&apos;ll feel easier.
      </Text>
      <Button href={todayUrl}>See full plan</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
