import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="px-5 pt-6 pb-24 flex flex-col gap-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}
