import { Skeleton } from '@/components/ui/skeleton'

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-24 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        {/* Toggle */}
        <Skeleton className="h-10 w-48 rounded-2xl mb-4" />
        {/* Tabs */}
        <Skeleton className="h-12 w-full rounded-2xl mb-4" />
        {/* Cards */}
        <div className="flex flex-col gap-3">
          <Skeleton className="rounded-2xl h-24" />
          <Skeleton className="rounded-2xl h-24" />
          <Skeleton className="rounded-2xl h-24" />
        </div>
      </div>
    </div>
  )
}
