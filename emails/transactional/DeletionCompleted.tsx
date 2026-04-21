import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; }

export default function DeletionCompleted({ firstName = "there" }: Props) {
  return (
    <Layout preview="Everything's gone. As it should be.">
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        Your Vita account and all its data have been permanently deleted.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
        If you ever want to start again, the door&apos;s open.
      </Text>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
