export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 pt-14 pb-24">
        {/* Back link area */}
        <div className="h-4 w-32 bg-muted animate-pulse rounded-2xl mb-4" />

        {/* Heading */}
        <div className="h-8 w-48 bg-muted animate-pulse rounded-2xl mb-4" />

        {/* View toggle pill */}
        <div className="h-10 w-36 bg-muted animate-pulse rounded-2xl mb-4" />

        {/* Calendar skeleton */}
        <div className="w-full rounded-lg border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-8 gap-px bg-border">
            <div className="bg-muted h-10" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-muted h-10 animate-pulse" />
            ))}
          </div>

          {/* Time grid rows */}
          {Array.from({ length: 12 }).map((_, row) => (
            <div key={row} className="grid grid-cols-8 gap-px bg-border">
              {/* Time label column */}
              <div className="bg-card h-12 flex items-start pt-1 pr-2 justify-end">
                {row % 2 === 0 && (
                  <div className="h-3 w-8 bg-muted animate-pulse rounded" />
                )}
              </div>
              {/* Day columns */}
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="bg-card h-12 relative">
                  {row % 4 === 0 && col % 3 === 0 && (
                    <div className="absolute inset-1 bg-muted animate-pulse rounded" />
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
