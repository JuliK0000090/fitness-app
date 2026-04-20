import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/mockups");
mkdirSync(OUT, { recursive: true });

const KEY = "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";

const PROMPTS = [
  {
    file: "mockup-1-today.png",
    label: "Concept A — Minimal Dark",
    prompt: `High-fidelity iPhone 15 Pro UI mockup screenshot, fitness app TODAY screen.
Design style: ultra-minimal luxury, inspired by Net-a-Porter and Equinox.
Dark background #0A0A0F. Typography: large Cormorant Garamond serif heading "Good morning, James" in off-white.
Content: current weight "182 lbs" with a tiny sparkline, today's 3-item checklist with elegant thin checkboxes,
an XP progress bar labeled "Level 4 · 820 XP", one upcoming workout card "Upper Body · 45 min".
Color palette: near-black background, white text at varying opacity, single warm gold accent #C9A96E for key numbers.
Hairline borders on cards, no bright colors, no rainbow gradients, no purple or cyan.
Clean whitespace, editorial layout, photorealistic UI screenshot, single phone frame.`,
  },
  {
    file: "mockup-2-chat.png",
    label: "Concept B — Editorial Light",
    prompt: `High-fidelity iPhone 15 Pro UI mockup screenshot, fitness app AI COACH chat screen.
Design style: editorial luxury, inspired by Aesop and Loro Piana — warm off-white background #F5F0E8.
Typography: small-caps "VITA" logo top left, Cormorant Garamond serif for coach messages.
Content: chat conversation — coach bubble "You're 0.4 kg from your goal. Here's what I'd adjust this week."
with a small inline workout card showing 3 exercises, user bubble "How is my sleep affecting recovery?",
a minimal text input bar at the bottom "Ask Vita anything...".
Color palette: warm cream background, near-black text, single dark charcoal accent for buttons.
Refined card borders, no colorful icons, no gradients, clean editorial typography.
Photorealistic UI screenshot, single phone frame.`,
  },
  {
    file: "mockup-3-dashboard.png",
    label: "Concept C — Premium Dark Glass",
    prompt: `High-fidelity iPhone 15 Pro UI mockup screenshot, fitness app PROGRESS dashboard screen.
Design style: premium dark glassmorphism, inspired by high-end fintech apps and Bloomberg terminal.
Very dark background #060810. Frosted glass cards with 1px white/8% borders.
Content: top section shows body weight chart over 8 weeks — clean line chart, no grid clutter,
"−3.2 kg" in large serif type with a small down-arrow. Below: a 4-column stat row (Steps, Sleep, HRV, Calories)
each as a small glass card. Bottom: "This Week" habit tracker — 7 thin vertical bars,
filled days in bright white, empty in white/15%.
Color palette: near-black, white at varying opacity for hierarchy, one subtle platinum highlight.
No purple, cyan, pink. Typography: Cormorant serif for numbers, Geist sans for labels.
Photorealistic UI screenshot, single phone frame.`,
  },
];

async function generate(prompt, file, label) {
  console.log(`\nGenerating: ${label}...`);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const images = data?.choices?.[0]?.message?.images;
  if (!images?.length) {
    console.error("No images returned:", JSON.stringify(data).slice(0, 300));
    return false;
  }

  const b64 = images[0].image_url.url.replace(/^data:image\/\w+;base64,/, "");
  const outPath = join(OUT, file);
  writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`  ✓ Saved → public/mockups/${file}`);
  return true;
}

for (const { prompt, file, label } of PROMPTS) {
  await generate(prompt, file, label);
}
console.log("\nDone.");
