import Link from "next/link";

export const metadata = {
  title: "Privacy — Vita",
  description: "How Vita handles your data, your health data, and your rights under PIPEDA and GDPR.",
};

const LAST_UPDATED = "2026-04-30";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <nav
        className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
      >
        <Link href="/" className="font-serif text-body-lg tracking-[0.22em] uppercase font-light text-text-primary">
          Vita
        </Link>
        <Link
          href="/auth/login"
          className="text-caption tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
        >
          Sign in
        </Link>
      </nav>

      <article className="max-w-[640px] mx-auto px-6 py-12 md:py-16">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
          Privacy
        </p>
        <h1 className="mt-3 font-serif text-display-lg font-light leading-tight">
          What Vita does with your data.
        </h1>
        <p className="mt-3 text-caption text-text-muted">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-12 space-y-10 text-body text-text-secondary leading-relaxed">

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              What we collect
            </h2>
            <p>
              Account information you provide: your name, email, timezone,
              and anything you tell Vita in conversation. Health data from
              Apple Health (steps, sleep, heart rate, HRV, workouts) when
              you connect via the Health Auto Export app. Body measurements
              and progress photos you upload yourself. We do not collect
              location, contacts, or device identifiers beyond what your
              browser needs to keep you signed in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Where it lives
            </h2>
            <p>
              In a Postgres database hosted on Railway, in the United
              States, encrypted at rest. Conversation context is processed
              by Anthropic&apos;s Claude API for AI inference; Anthropic
              does not retain or train on your data. We do not use any
              third-party advertising networks, analytics that track you
              across sites, or data brokers. We will never sell your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Your rights
            </h2>
            <p>
              Under PIPEDA (Canada) and GDPR (European Union), you have
              the right to access your data, correct it, request its
              deletion, and request a portable copy. Three of those four
              are self-serve in the app today; deletion is a one-email
              process while we automate it.
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li>
                <span className="text-text-primary">Access:</span> request
                a JSON export from Settings → Account → Export.
              </li>
              <li>
                <span className="text-text-primary">Correction:</span> any
                field is editable in Settings or by asking Vita to update it.
              </li>
              <li>
                <span className="text-text-primary">Deletion:</span> email{" "}
                <a href="mailto:juliana.kolarski@gmail.com" className="text-champagne hover:underline">
                  juliana.kolarski@gmail.com
                </a>{" "}
                or use Settings → Account → Delete account. We remove your
                data within 30 days, except where retention is legally
                required.
              </li>
              <li>
                <span className="text-text-primary">Portability:</span> the
                JSON export is yours — open standard, no lock-in.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Apple Health
            </h2>
            <p>
              When you connect Apple Health, your iPhone pushes daily
              metrics to Vita on a schedule you control. Disconnecting in
              Settings → Integrations stops new data from arriving.
              Existing history is preserved unless you delete it
              explicitly. Raw payloads are kept for 30 days for debugging
              and then auto-deleted; the rolled-up daily summaries (steps,
              sleep, HRV, resting HR) are retained while your account is
              active.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Push notifications
            </h2>
            <p>
              We use web push (VAPID protocol) for the few categories of
              alerts you opt into in Settings → Notifications. We never
              send marketing pushes. The notification body is generated
              server-side from your own data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Children
            </h2>
            <p>
              Vita is not for users under 16. If we discover an account
              belongs to a minor, we delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Changes to this policy
            </h2>
            <p>
              We&apos;ll update the &quot;last updated&quot; date at the
              top of this page when material changes happen, and email
              you for anything that meaningfully changes how your data is
              used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-heading-lg font-light text-text-primary">
              Contact
            </h2>
            <p>
              Questions, requests, or anything else:{" "}
              <a href="mailto:juliana.kolarski@gmail.com" className="text-champagne hover:underline">
                juliana.kolarski@gmail.com
              </a>
              . — Juliana, founder.
            </p>
          </section>
        </div>

        <p className="mt-16 text-caption text-text-disabled">
          <Link href="/" className="hover:text-text-muted transition-colors">
            ← Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
