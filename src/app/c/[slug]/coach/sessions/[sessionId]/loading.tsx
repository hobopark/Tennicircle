import { Skeleton } from '@/components/ui/skeleton'

export default function SessionDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link skeleton */}
        <Skeleton className="rounded-2xl h-5 w-32 mb-6" />

        {/* Session header */}
        <div className="flex flex-col gap-2 mb-6">
          <Skeleton className="rounded-2xl h-7 w-48" />
          <Skeleton className="rounded-2xl h-5 w-64" />
          <Skeleton className="rounded-2xl h-4 w-40" />
        </div>

        {/* Attendees section */}
        <Skeleton className="rounded-2xl h-6 w-36 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="rounded-full w-8 h-8" />
              <Skeleton className="rounded-2xl h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Progress notes section */}
        <Skeleton className="rounded-2xl h-6 w-32 mt-8 mb-3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="rounded-2xl h-20" />
          ))}
        </div>
      </div>
    </div>
  )
}
