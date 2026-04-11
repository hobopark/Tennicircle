import { Skeleton } from '@/components/ui/skeleton'

export default function CoachLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        {/* Greeting area */}
        <Skeleton className="h-4 w-32 rounded-2xl mb-2" />
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-48 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-40 rounded-2xl" />
            <Skeleton className="h-4 w-20 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-36 rounded-2xl" />
            <Skeleton className="h-4 w-16 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
