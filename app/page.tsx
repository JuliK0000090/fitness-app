import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

const FEATURES = [
  { num: "01", title: "Intelligent Coaching", desc: "Understands your goals in natural language. Context-aware guidance that evolves with you over time." },
  { num: "02", title: "Precision Tracking", desc: "Log workouts, nutrition, and measurements conversationally. No forms, no friction." },
  { num: "03", title: "Goal Architecture", desc: "Set goals naturally. Vita models your trajectory and adapts your plan as life changes." },
  { num: "04", title: "Body Composition", desc: "Detailed measurement tracking with trend analysis and AI-powered visual progress tools." },
  { num: "05", title: "Wearable Sync", desc: "Unified data from Apple Health, Garmin, WHOOP, Oura, and more — all in one view." },
  { num: "06", title: "Safety & Wellbeing", desc: "Built-in guardrails for sustainable progress. Your long-term health is always the priority." },
];

const C = {
  bg:      "#060810",
  white90: "rgba(255,255,255,0.90)",
  white70: "rgba(255,255,255,0.70)",
  white45: "rgba(255,255,255,0.45)",
  white28: "rgba(255,255,255,0.28)",
  white18: "rgba(255,255,255,0.18)",
  white10: "rgba(255,255,255,0.10)",
  white07: "rgba(255,255,255,0.07)",
  serif:   "var(--font-serif-face)",
  sans:    "var(--font-geist-sans)",
} as const;

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.white90, fontFamily: C.sans }}>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "28px 56px", maxWidth: 1280, margin: "0 auto",
      }}>
        <span style={{ fontFamily: C.serif, fontSize: 17, fontWeight: 300, letterSpacing: "0.22em", textTransform: "uppercase", color: C.white90 }}>
          Vita
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <Link href="/auth/login" style={{ fontFamily: C.sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: C.white45, textDecoration: "none" }}>
            Sign in
          </Link>
          <Link href="/auth/register" style={{
            fontFamily: C.sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "10px 26px", border: `1px solid ${C.white28}`, color: C.white70, textDecoration: "none",
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 56px 80px" }}>
        <p style={{ fontFamily: C.sans, fontSize: 10, letterSpacing: "0.38em", textTransform: "uppercase", color: C.white28, marginBottom: 28 }}>
          AI Personal Training
        </p>
        <h1 style={{
          fontFamily: C.serif, fontWeight: 300, lineHeight: 1.08,
          fontSize: "clamp(48px, 6vw, 76px)",
          color: C.white90, margin: "0 0 24px", letterSpacing: "-0.01em",
        }}>
          Your body,<br />
          <span style={{ fontStyle: "italic", color: C.white45 }}>understood.</span>
        </h1>
        <p style={{
          fontFamily: C.sans, fontSize: 15, color: C.white45,
          maxWidth: 400, lineHeight: 1.8, marginBottom: 44, fontWeight: 300,
        }}>
          Vita is an AI fitness coach that learns how you move, what you eat,
          and what you want. It advises, adapts, and holds you to the standard you set.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/auth/register" style={{
            fontFamily: C.sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "13px 34px", background: C.white90, color: C.bg, textDecoration: "none", fontWeight: 500,
          }}>
            Begin
          </Link>
          <Link href="/auth/login" style={{ fontFamily: C.sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: C.white28, textDecoration: "none" }}>
            Sign in →
          </Link>
        </div>
      </section>

      {/* ── Rule ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ height: 1, background: C.white07 }} />
      </div>

      {/* ── Features ── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {FEATURES.map(({ num, title, desc }, i) => (
            <div key={num} style={{
              padding: "44px 36px",
              borderRight: (i + 1) % 3 !== 0 ? `1px solid ${C.white07}` : "none",
              borderBottom: i < 3 ? `1px solid ${C.white07}` : "none",
            }}>
              <p style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", color: C.white18, marginBottom: 20 }}>{num}</p>
              <h3 style={{ fontFamily: C.serif, fontSize: 20, fontWeight: 400, color: C.white90, marginBottom: 10, lineHeight: 1.2 }}>{title}</h3>
              <p style={{ fontFamily: C.sans, fontSize: 13, color: C.white45, lineHeight: 1.75, fontWeight: 300 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rule ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ height: 1, background: C.white07 }} />
      </div>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "88px 56px 108px" }}>
        <p style={{ fontFamily: C.sans, fontSize: 10, letterSpacing: "0.38em", textTransform: "uppercase", color: C.white18, marginBottom: 28 }}>Start today</p>
        <h2 style={{
          fontFamily: C.serif, fontWeight: 300, lineHeight: 1.1,
          fontSize: "clamp(40px, 5vw, 64px)",
          color: C.white90, margin: "0 0 40px",
        }}>
          Precision coaching,<br />
          <span style={{ fontStyle: "italic", color: C.white45 }}>no compromise.</span>
        </h2>
        <Link href="/auth/register" style={{
          fontFamily: C.sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
          padding: "13px 40px", border: `1px solid ${C.white28}`, color: C.white70, textDecoration: "none", display: "inline-block",
        }}>
          Create your account
        </Link>
      </section>

      {/* ── Footer ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 56px 52px" }}>
        <div style={{ height: 1, background: C.white07, marginBottom: 28 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: C.serif, fontSize: 13, fontWeight: 300, letterSpacing: "0.15em", textTransform: "uppercase", color: C.white18 }}>Vita</span>
          <div style={{ display: "flex", gap: 32 }}>
            <Link href="/legal/privacy" style={{ fontFamily: C.sans, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.white18, textDecoration: "none" }}>Privacy</Link>
            <Link href="/legal/terms"   style={{ fontFamily: C.sans, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.white18, textDecoration: "none" }}>Terms</Link>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: 10, color: "rgba(255,255,255,0.12)" }}>Not medical advice. Consult a healthcare professional.</p>
        </div>
      </div>

    </div>
  );
}
