export default function AuthLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center pt-[12vh] px-4">
      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332]" />

      {/* Court-pattern grid overlay */}
      <div className="absolute inset-0 court-pattern-light" />

      {/* Brand lockup */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gradient-gold tracking-tight mb-3">
          TenniCircle
        </h1>
        <p className="font-sans text-sm uppercase tracking-[0.2em] text-white/60">
          Your Court. Your Community.
        </p>
      </div>

      {/* Glassmorphic card shell with spinner */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/90 dark:bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/30 dark:border-white/10 flex items-center justify-center min-h-[200px]">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
