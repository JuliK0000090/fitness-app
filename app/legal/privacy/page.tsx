export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: April 2026</p>
      <div className="prose prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
        <p>
          Vita takes your privacy seriously. This is a placeholder for the full Privacy Policy.
          Please consult a legal professional to draft appropriate terms for your jurisdiction.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Data we collect</h2>
        <p>Name, email, date of birth, body measurements, fitness logs, photos, and health notes you provide.</p>
        <h2 className="text-base font-semibold text-foreground mt-6">How we use it</h2>
        <p>To provide personalised AI coaching, generate plans, and improve your experience.</p>
        <h2 className="text-base font-semibold text-foreground mt-6">Data export & deletion</h2>
        <p>You can export all your data at any time from Settings. You can request account deletion, which removes all data after a 30-day grace period.</p>
        <h2 className="text-base font-semibold text-foreground mt-6">Health data (Apple Health)</h2>
        <p>
          Health data is received from your iPhone via the Health Auto Export app and stored on Vita&apos;s servers
          (currently hosted in the US via Railway). We use this data only to show you your own information and
          power personalized coaching. We do not sell, share, or market this data to any third party.
        </p>
        <p>
          Under PIPEDA (Canada) and GDPR (EU), you have the right to access, correct, and delete your data.
          You can disconnect Apple Health at any time from Settings — disconnecting stops new data from being
          received and preserves your existing history. To delete all historical health data, contact support
          and we will remove it within 30 days.
        </p>
        <p>
          Raw payload data (the JSON Apple Health sends us) is automatically deleted after 30 days.
          Processed daily summaries (steps, sleep, HRV, etc.) are retained for as long as your account is active.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p>Questions? Email privacy@vitacoach.app</p>
      </div>
    </div>
  );
}
