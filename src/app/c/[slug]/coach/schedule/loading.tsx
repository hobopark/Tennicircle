import { Skeleton } from '@/components/ui/skeleton'

export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-24">
        {/* Back link area */}
        <Skeleton className="h-4 w-32 rounded-2xl mb-4" />

        {/* Heading */}
        <Skeleton className="h-8 w-48 rounded-2xl mb-4" />

        {/* View toggle pill */}
        <Skeleton className="h-10 w-36 rounded-2xl mb-4" />

        {/* Calendar skeleton */}
        <div className="w-full rounded-lg border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-8 gap-px bg-border">
            <Skeleton className="h-10 rounded-none" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-none" />
            ))}
          </div>

          {/* Time grid rows */}
          {Array.from({ length: 12 }).map((_, row) => (
            <div key={row} className="grid grid-cols-8 gap-px bg-border">
              {/* Time label column */}
              <div className="bg-card h-12 flex items-start pt-1 pr-2 justify-end">
                {row % 2 === 0 && (
                  <Skeleton className="h-3 w-8 rounded" />
                )}
              </div>
              {/* Day columns */}
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="bg-card h-12 relative">
                  {row % 4 === 0 && col % 3 === 0 && (
                    <Skeleton className="absolute inset-1 rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
