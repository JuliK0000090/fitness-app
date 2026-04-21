import { Text, Hr } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; amount: string; plan: string; nextBillingDate: string; receiptUrl: string; }

export default function Receipt({ firstName = "there", amount = "$0.00", plan = "Pro", nextBillingDate = "next month", receiptUrl = "https://example.com" }: Props) {
  return (
    <Layout preview={`${plan} — ${amount}. Thanks.`}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Payment confirmed. Here&apos;s the summary:
      </Text>
      <Hr style={{ borderColor: "#E8E6E0", margin: "16px 0" }} />
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>Plan: {plan}</Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>Amount: {amount}</Text>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>Next billing: {nextBillingDate}</Text>
      <Hr style={{ borderColor: "#E8E6E0", margin: "16px 0" }} />
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#6B6B6B", margin: "0 0 8px" }}>
        Receipt: <a href={receiptUrl} style={{ color: "#6B6B6B" }}>{receiptUrl}</a>
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
