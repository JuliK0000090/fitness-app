export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: April 2026</p>
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          This is a placeholder for the full Terms of Service.
          Please consult a legal professional to draft appropriate terms for your jurisdiction.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Not medical advice</h2>
        <p>
          Vita provides general fitness and wellness guidance only. Nothing on this platform constitutes
          medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional
          before starting any new exercise or nutrition programme.
        </p>
        <h2 className="text-base font-semibold text-foreground mt-6">Acceptable use</h2>
        <p>Use Vita only for lawful personal fitness tracking. Do not attempt to reverse-engineer or misuse the platform.</p>
        <h2 className="text-base font-semibold text-foreground mt-6">Contact</h2>
        <p>Questions? Email legal@vitacoach.app</p>
      </div>
    </div>
  );
}
