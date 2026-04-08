export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-[15vh] px-4">
      <p className="font-display text-[20px] font-bold text-foreground text-center mb-12">
        TenniCircle
      </p>
      <div className="w-full max-w-[440px] bg-popover p-6 sm:p-8 sm:rounded-2xl sm:shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-center justify-center min-h-[200px]">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
