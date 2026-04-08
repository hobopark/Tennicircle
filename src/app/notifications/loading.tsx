import { Skeleton } from '@/components/ui/skeleton'

export default function NotificationsLoading() {
  return (
    <div className="px-6 pt-6 pb-20 space-y-3" aria-label="Loading notifications">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 p-4 rounded-2xl bg-card">
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
