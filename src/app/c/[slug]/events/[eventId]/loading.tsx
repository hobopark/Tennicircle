import { Skeleton } from '@/components/ui/skeleton'

export default function EventDetailLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex flex-col gap-3">
        <Skeleton className="rounded-2xl h-48" />
        <Skeleton className="rounded-2xl h-32" />
      </div>
    </div>
  )
}
