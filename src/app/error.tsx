'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold text-foreground">Something went wrong</h1>
        <p className="text-base text-muted-foreground mt-2">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center mt-6 h-[44px] px-6 rounded-xl bg-primary text-primary-foreground text-sm font-sans hover:bg-[#265178] active:bg-[#1F4466] transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
