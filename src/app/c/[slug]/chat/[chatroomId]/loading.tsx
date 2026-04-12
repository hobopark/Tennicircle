import { Skeleton } from '@/components/ui/skeleton'

export default function ChatRoomLoading() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 rounded-lg mb-1" />
          <Skeleton className="h-3 w-20 rounded-lg" />
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
          <Skeleton className="h-16 w-56 rounded-2xl" />
        </div>
      </div>
      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}
