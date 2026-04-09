import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="px-5 pt-6 pb-24 flex flex-col gap-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}
