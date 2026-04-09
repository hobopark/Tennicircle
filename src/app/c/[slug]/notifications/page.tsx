import { createClient, getUserRole } from '@/lib/supabase/server'
import { NotificationFeed } from '@/components/notifications/NotificationFeed'
import { AppNav } from '@/components/nav/AppNav'
import type { NotificationRow } from '@/lib/types/notifications'
import type { UserRole } from '@/lib/types/auth'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialNotifications: NotificationRow[] = []
  let memberId = ''
  let userRole: UserRole = 'pending'

  if (user) {
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single()

    if (community) {
      const membership = await getUserRole(supabase, community.id)
      if (membership) {
        userRole = membership.role as UserRole
        memberId = membership.memberId

        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(50)

        initialNotifications = (notifications as NotificationRow[]) ?? []
      }
    }
  }

  return (
    <div className="px-6 pt-6 pb-20">
      <NotificationFeed initialNotifications={initialNotifications} memberId={memberId} userRole={userRole} />
      <AppNav />
    </div>
  )
}
