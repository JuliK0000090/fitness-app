import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/today");

  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center p-6">
      <div className="relative z-10 max-w-lg text-center space-y-6 fu">
        <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#A78BFA] via-[#22D3EE] to-[#F472B6] bg-clip-text text-transparent">
          vita
        </div>
        <p className="text-lg text-muted-foreground">
          Your AI fitness coach. Personalised plans, real accountability, and the best tracking on earth.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#A78BFA] to-[#7C3AED]">
              Get started free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Not medical advice. Always consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
