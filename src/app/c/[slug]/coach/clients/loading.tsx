import { Loader2 } from 'lucide-react'

export default function ClientsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
        <div className="bg-muted animate-pulse rounded-lg h-8 w-32 mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-muted animate-pulse rounded-2xl h-[72px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
