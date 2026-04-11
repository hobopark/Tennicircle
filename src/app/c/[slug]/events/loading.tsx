import { Skeleton } from '@/components/ui/skeleton'

export default function EventsLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex flex-col gap-3">
        <Skeleton className="rounded-2xl h-24" />
        <Skeleton className="rounded-2xl h-24" />
        <Skeleton className="rounded-2xl h-24" />
        <Skeleton className="rounded-2xl h-24" />
      </div>
    </div>
  )
}
