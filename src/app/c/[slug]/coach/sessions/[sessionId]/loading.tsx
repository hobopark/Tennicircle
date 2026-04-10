import { Loader2 } from 'lucide-react'

export default function SessionDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        {/* Back link skeleton */}
        <div className="bg-muted animate-pulse rounded-lg h-5 w-32 mb-6" />

        {/* Session header */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="bg-muted animate-pulse rounded-lg h-7 w-48" />
          <div className="bg-muted animate-pulse rounded-lg h-5 w-64" />
          <div className="bg-muted animate-pulse rounded-lg h-4 w-40" />
        </div>

        {/* Attendees section */}
        <div className="bg-muted animate-pulse rounded-lg h-6 w-36 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="bg-muted animate-pulse rounded-full w-8 h-8" />
              <div className="bg-muted animate-pulse rounded-lg h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Progress notes section */}
        <div className="bg-muted animate-pulse rounded-lg h-6 w-32 mt-8 mb-3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-2xl h-20" />
          ))}
        </div>
      </div>
    </div>
  )
}
