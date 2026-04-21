import { Text } from "@react-email/components";
import { Layout } from "../_components/Layout";

interface Props { firstName: string; enabled: boolean; }

export default function TwoFactor({ firstName = "there", enabled = true }: Props) {
  return (
    <Layout preview={enabled ? "One more layer between you and trouble." : "Two-factor authentication is now off."}>
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>{firstName},</Text>
      {enabled ? (
        <>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
            Two-factor authentication is now active. From the next sign-in, you&apos;ll need your authenticator code.
          </Text>
          <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
            Keep your recovery codes somewhere safe — they&apos;re the only way back in if you lose your phone.
          </Text>
        </>
      ) : (
        <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "0 0 16px" }}>
          Two-factor authentication has been turned off. If this wasn&apos;t you, secure your account immediately.
        </Text>
      )}
      <Text style={{ fontSize: 16, lineHeight: "26px", color: "#1A1A1A", margin: "24px 0 0" }}>— Vita</Text>
    </Layout>
  );
}
