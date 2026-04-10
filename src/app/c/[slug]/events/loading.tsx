import { Loader2 } from 'lucide-react'

export default function EventsLoading() {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
        <div className="bg-muted animate-pulse rounded-3xl h-24" />
      </div>
    </div>
  )
}
