import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "./PrintButton";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Shared admin gate for both decks. 404 (not 403) when the visitor
 * isn't an admin, so the existence of these pages isn't broadcast to
 * randoms.
 */
export async function requireDeckAccess(): Promise<void> {
  const session = await getSession();
  if (!session) notFound();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) notFound();
}

/**
 * Render a personalization placeholder. Stays terracotta-italic until
 * the deck author replaces the literal text in source.
 */
export function Token({ children }: { children: React.ReactNode }) {
  return <span className="deck-token">{children}</span>;
}

/**
 * Toolbar at the top of each deck: print button + reminder banner.
 * Hidden in @media print.
 */
export function DeckToolbar({ tokensRemaining }: { tokensRemaining?: boolean }) {
  return (
    <div
      className="deck-noprint sticky top-0 z-50 px-6 py-3 flex items-center justify-between gap-4 backdrop-blur"
      style={{ background: "rgba(10,13,18,0.85)", borderBottom: "1px solid #2A3142" }}
    >
      {tokensRemaining ? (
        <p className="text-caption" style={{ color: "#C77B5C" }}>
          Personalize the tokens (highlighted in terracotta) before sending.
        </p>
      ) : (
        <span className="text-caption" style={{ color: "#A8A29A" }}>
          Cmd+P to export to PDF.
        </span>
      )}
      <PrintButton />
    </div>
  );
}

