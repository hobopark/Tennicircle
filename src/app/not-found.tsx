import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold text-foreground">Page not found</h1>
        <p className="text-base text-muted-foreground mt-2">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-6 h-[44px] px-6 rounded-xl bg-primary text-primary-foreground text-sm font-sans hover:bg-[#265178] active:bg-[#1F4466] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
