import { Loader2 } from 'lucide-react'

export default function CoachLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        {/* Greeting area */}
        <div className="h-4 w-32 bg-muted animate-pulse rounded-2xl mb-2" />
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-2xl" />
          <div className="h-10 w-36 bg-muted animate-pulse rounded-2xl" />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="h-20 bg-muted animate-pulse rounded-2xl" />
          <div className="h-20 bg-muted animate-pulse rounded-2xl" />
          <div className="h-20 bg-muted animate-pulse rounded-2xl" />
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-40 bg-muted animate-pulse rounded-2xl" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-28 bg-muted animate-pulse rounded-2xl" />
            <div className="h-28 bg-muted animate-pulse rounded-2xl" />
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-36 bg-muted animate-pulse rounded-2xl" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-28 bg-muted animate-pulse rounded-2xl" />
            <div className="h-28 bg-muted animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
