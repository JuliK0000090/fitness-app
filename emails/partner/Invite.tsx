import { Text, Link, Button, Section } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props {
  userFirstName: string;
  partnerName: string;
  acceptUrl: string;
  unsubscribeUrl?: string;
}

export default function PartnerInvite({
  userFirstName = "there",
  partnerName = "friend",
  acceptUrl = "https://example.com/partner/accept/...",
  unsubscribeUrl,
}: Props) {
  return (
    <Layout preview={`${userFirstName} wants you in their corner.`} unsubscribeUrl={unsubscribeUrl}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Hi {partnerName},
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        {userFirstName} is using Vita — a private trainer app — and wants you as her one accountability
        partner. That means once a week, on Sunday, you get a quiet email with how her week went.
        Workouts done. Habits stuck with. Streak alive or not.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        No app to download. No daily pings. No public feed. Just one weekly note. You can reply to her
        by tapping a button. That's it.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button
          href={acceptUrl}
          style={{
            backgroundColor: "#D4C4A8",
            color: "#1A1A1A",
            padding: "12px 24px",
            borderRadius: "4px",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          I'm in
        </Button>
      </Section>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#666", margin: "16px 0" }}>
        If you're not, just don't click. Nothing happens.
      </Text>
      <Text style={{ fontSize: 12, lineHeight: "18px", color: "#999", margin: "32px 0 0" }}>
        Or paste this in a browser: <Link href={acceptUrl} style={{ color: "#999" }}>{acceptUrl}</Link>
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>
        — Vita<br />
        on behalf of {userFirstName}
      </Text>
    </Layout>
  );
}
