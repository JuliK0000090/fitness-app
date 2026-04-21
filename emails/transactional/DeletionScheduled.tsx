import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";
import { Button } from "../_components/Button";

interface Props { firstName: string; deletionDate: string; keepUrl: string; }

export default function DeletionScheduled({ firstName = "there", deletionDate = "30 days from now", keepUrl = "https://example.com" }: Props) {
  return (
    <Layout preview="Change your mind anytime before then.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your Vita account is scheduled for deletion on {deletionDate}. That gives you 30 days to change your mind.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        I&apos;m sorry to see you go. If there&apos;s something I could have done differently, I&apos;d want to know.
      </Text>
      <Button href={keepUrl}>Keep my account</Button>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
