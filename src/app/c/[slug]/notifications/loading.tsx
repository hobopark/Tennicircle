import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="px-5 pt-6 pb-24 flex flex-col gap-4">
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}
