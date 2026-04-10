import { Loader2 } from 'lucide-react'

export default function EditEventLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
      {/* Back link skeleton */}
      <div className="bg-muted animate-pulse rounded-lg h-5 w-28 mb-4" />

      {/* Title */}
      <div className="bg-muted animate-pulse rounded-lg h-8 w-32 mb-6" />

      {/* Form field skeletons */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="bg-muted animate-pulse rounded-lg h-4 w-20 mb-1" />
            <div className="bg-muted animate-pulse rounded-2xl h-12" />
          </div>
        ))}
        <div className="bg-muted animate-pulse rounded-2xl h-12 mt-2" />
      </div>
    </div>
  )
}
