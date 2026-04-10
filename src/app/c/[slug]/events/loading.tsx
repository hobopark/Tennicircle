import { Loader2 } from 'lucide-react'

export default function EventsLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
      </div>
    </div>
  )
}
