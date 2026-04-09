import { Skeleton } from '@/components/ui/skeleton'

export default function CommunitiesLoading() {
  return (
    <div className="px-5 pt-16 pb-24">
      <Skeleton className="h-8 w-48 rounded-lg mb-6" />
      <Skeleton className="h-6 w-36 rounded-lg mb-3" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
    </div>
  )
}
