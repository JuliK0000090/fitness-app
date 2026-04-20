export const metadata = { title: "Vita — Design Mockups" };

const MOCKUPS = [
  {
    file: "/mockups/mockup-1-today.png",
    label: "Concept A",
    title: "Minimal Dark",
    desc: "Near-black background, Cormorant serif headlines, warm gold accent. Inspired by Net-a-Porter and Equinox. Ultra-restrained palette.",
  },
  {
    file: "/mockups/mockup-2-chat.png",
    label: "Concept B",
    title: "Editorial Light",
    desc: "Warm cream background, charcoal type, no color accents. Inspired by Aesop and Loro Piana. AI coach conversation view.",
  },
  {
    file: "/mockups/mockup-3-dashboard.png",
    label: "Concept C",
    title: "Premium Dark Glass",
    desc: "Deep navy background, frosted glass cards, platinum highlights. Inspired by high-end fintech. Progress dashboard view.",
  },
];

export default function MockupsPage() {
  return (
    <div style={{ background: "#08080F", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "white", padding: "60px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
            Vita · Design Exploration
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.02em", marginBottom: 12 }}>
            UI/UX Concepts
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 480, lineHeight: 1.6 }}>
            Three distinct directions for the Vita experience. Review and share your feedback on which direction — or combination — feels right.
          </p>
        </div>

        {/* Mockup grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
          {MOCKUPS.map(({ file, label, title, desc }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Image */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                overflow: "hidden",
                aspectRatio: "9/19",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file}
                  alt={title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>

              {/* Label */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
                    {label}
                  </span>
                  <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.15)" }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                    {title}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 80, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7 }}>
            Generated with Google Gemini 2.5 Flash Image · These are AI-generated concept directions, not final designs.<br />
            Share your feedback — preferred concept, elements to keep, elements to change, or a new direction entirely.
          </p>
        </div>

      </div>
    </div>
  );
}
