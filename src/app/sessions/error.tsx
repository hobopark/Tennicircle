'use client'

import { TriangleAlert } from 'lucide-react'

export default function SessionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="rounded-3xl border border-border/50 bg-card p-8 max-w-md w-full text-center">
        <TriangleAlert className="w-10 h-10 text-destructive mx-auto mb-4" />
        <h2 className="font-heading font-bold text-xl mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-2xl px-6 py-3 font-heading font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
