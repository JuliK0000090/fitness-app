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
        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p>Questions? Email privacy@vitacoach.app</p>
      </div>
    </div>
  );
}
