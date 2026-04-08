import { createClient } from '@/lib/supabase/server'
import { NotificationFeed } from '@/components/notifications/NotificationFeed'
import type { NotificationRow } from '@/lib/types/notifications'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let initialNotifications: NotificationRow[] = []
  let memberId = ''

  if (user) {
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (member) {
      memberId = member.id
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(50)

      initialNotifications = (notifications as NotificationRow[]) ?? []
    }
  }

  return (
    <div className="px-6 pt-6 pb-20">
      <NotificationFeed initialNotifications={initialNotifications} memberId={memberId} />
    </div>
  )
}
