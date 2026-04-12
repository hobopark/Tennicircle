import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <Skeleton className="h-8 w-16 rounded-2xl mb-4" />
        <div className="flex flex-col gap-2">
          <Skeleton className="rounded-2xl h-16" />
          <Skeleton className="rounded-2xl h-16" />
          <Skeleton className="rounded-2xl h-16" />
        </div>
      </div>
    </div>
  )
}
