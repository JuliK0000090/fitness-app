import { VitaWordmark } from "@/components/ui/VitaWordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-base min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <VitaWordmark size="lg" className="text-text-primary" />
        </div>
        {children}
      </div>
    </div>
  );
}
