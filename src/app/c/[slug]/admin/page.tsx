export const dynamic = 'force-dynamic'

import { AppNav } from '@/components/nav/AppNav'

export default function AdminDashboard() {
  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-[28px] font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-base text-muted-foreground mt-2">Coming in Phase 4</p>
        </div>
      </div>
    </>
  )
}
