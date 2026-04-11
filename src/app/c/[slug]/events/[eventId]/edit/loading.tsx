import { Skeleton } from '@/components/ui/skeleton'

export default function EditEventLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      {/* Back link skeleton */}
      <Skeleton className="rounded-2xl h-5 w-28 mb-4" />

      {/* Title */}
      <Skeleton className="rounded-2xl h-8 w-32 mb-6" />

      {/* Form field skeletons */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="rounded-2xl h-4 w-20 mb-1" />
            <Skeleton className="rounded-2xl h-12" />
          </div>
        ))}
        <Skeleton className="rounded-2xl h-12 mt-2" />
      </div>
    </div>
  )
}
