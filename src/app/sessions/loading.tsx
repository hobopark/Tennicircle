export default function SessionsLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex flex-col gap-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted animate-pulse rounded-2xl h-20" />
          <div className="bg-muted animate-pulse rounded-2xl h-20" />
          <div className="bg-muted animate-pulse rounded-2xl h-20" />
        </div>
        {/* Section 1 skeleton */}
        <div className="flex flex-col gap-3">
          <div className="bg-muted animate-pulse rounded-xl h-6 w-40" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
        </div>
        {/* Section 2 skeleton */}
        <div className="flex flex-col gap-3">
          <div className="bg-muted animate-pulse rounded-xl h-6 w-40" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
          <div className="bg-muted animate-pulse rounded-3xl h-20" />
        </div>
      </div>
    </div>
  )
}
