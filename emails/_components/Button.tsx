import { Button as EmailButton } from "@react-email/components";
import { tokens } from "./tokens";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: tokens.colors.accent,
        color: "#FFFFFF",
        borderRadius: tokens.radius,
        padding: "12px 24px",
        fontSize: tokens.size.body,
        fontFamily: tokens.font.body,
        textDecoration: "none",
        display: "inline-block",
        marginTop: 8,
        marginBottom: 8,
      }}
    >
      {children}
    </EmailButton>
  );
}
