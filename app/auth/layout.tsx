export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-cormorant text-2xl font-light tracking-[0.22em] uppercase text-white/80">
            Vita
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
