import { SessionCardSkeleton } from '@/components/sessions/SessionCardSkeleton'

export default function SessionsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
