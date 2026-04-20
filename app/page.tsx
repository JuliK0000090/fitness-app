import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Dumbbell, Target, Zap, Shield, Smartphone } from "lucide-react";

const FEATURES = [
  { icon: Brain, color: "#A78BFA", title: "AI Coach", desc: "Claude claude-sonnet-4-6 powers every conversation — context-aware, goal-focused, and always honest." },
  { icon: Dumbbell, color: "#22D3EE", title: "Smart Logging", desc: "Log workouts, meals, and measurements in plain English. No forms, just talk." },
  { icon: Target, color: "#34D399", title: "Goal Engine", desc: "Set goals in natural language. Vita tracks your trajectory and predicts your hit date." },
  { icon: Zap, color: "#FBBF24", title: "Gamification", desc: "Earn XP, unlock achievements, build streaks. Staying consistent has never felt better." },
  { icon: Shield, color: "#F472B6", title: "Safety First", desc: "Built-in guardrails for disordered eating and unsafe goals. Crisis resources always available." },
  { icon: Smartphone, color: "#A78BFA", title: "Full PWA", desc: "Install on any device. Works offline. Push notifications. Feels like a native app." },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");

  return (
    <div className="aurora-bg min-h-screen">
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="text-2xl font-bold bg-gradient-to-r from-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">
          vita
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Sign in</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm" className="bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center fu">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
          Powered by Claude claude-sonnet-4-6
        </div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-[#A78BFA] via-[#22D3EE] to-[#F472B6] bg-clip-text text-transparent">
            Your AI fitness coach
          </span>
          <br />
          <span className="text-foreground">that actually knows you.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Vita learns your goals, tracks your progress, and coaches you with the intelligence of Claude.
          No rigid plans — just a conversation that gets smarter every day.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow text-base px-8">
              Start for free →
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-border text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">No credit card required · Free to get started</p>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20 fu2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-colors group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: `${color}22` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <h3 className="text-sm font-bold mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / CTA */}
      <section className="relative z-10 max-w-lg mx-auto px-6 pb-24 text-center fu3">
        <div className="glass rounded-2xl p-8 border border-[#A78BFA]/20">
          <p className="text-2xl font-bold mb-2">Ready to transform?</p>
          <p className="text-sm text-muted-foreground mb-6">Join thousands of people training smarter with Vita.</p>
          <Link href="/auth/register">
            <Button size="lg" className="bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white w-full shadow-lg shadow-purple-500/20">
              Create your free account
            </Button>
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground mt-6">
          Not medical advice. Consult a healthcare professional before starting any new fitness programme.
        </p>
      </section>
    </div>
  );
}
