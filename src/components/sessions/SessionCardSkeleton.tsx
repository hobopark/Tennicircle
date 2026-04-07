export function SessionCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
      {/* Date + time row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
      {/* Venue row */}
      <div className="h-4 w-40 bg-muted rounded animate-pulse mb-2" />
      {/* Coach + spots row */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
      {/* Button row */}
      <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
    </div>
  )
}
