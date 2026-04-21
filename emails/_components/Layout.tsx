import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Preview,
} from "@react-email/components";
import { tokens } from "./tokens";

interface LayoutProps {
  preview?: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
  userId?: string;
}

export function Layout({ preview, children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body style={{ backgroundColor: tokens.colors.bg, fontFamily: tokens.font.body, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: tokens.maxWidth, margin: "0 auto", padding: "40px 24px" }}>
          {/* Wordmark */}
          <Text style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: tokens.colors.muted, marginBottom: 32, marginTop: 0 }}>
            vita
          </Text>

          {/* Body */}
          <Section>{children}</Section>

          {/* Footer */}
          <Hr style={{ borderColor: tokens.colors.rule, margin: "32px 0 24px" }} />
          <Text style={{ fontSize: tokens.size.small, color: tokens.colors.muted, margin: 0 }}>
            {unsubscribeUrl ? (
              <>
                You&apos;re receiving this because you use Vita.{" "}
                <Link href={unsubscribeUrl} style={{ color: tokens.colors.muted }}>
                  Unsubscribe
                </Link>
              </>
            ) : (
              "This is a transactional email — it cannot be unsubscribed from."
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
