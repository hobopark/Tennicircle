export default function ClientDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        {/* Back link skeleton */}
        <div className="bg-muted animate-pulse rounded-lg h-5 w-28 mb-4" />

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="bg-muted animate-pulse rounded-2xl w-20 h-20" />
          <div className="bg-muted animate-pulse rounded-lg h-7 w-40" />
          <div className="bg-muted animate-pulse rounded-lg h-4 w-24" />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-2xl h-[76px]" />
          ))}
        </div>

        {/* Lesson history skeletons */}
        <div className="bg-muted animate-pulse rounded-lg h-6 w-32 mb-3" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-2xl h-[72px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
