export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">
            vita
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
