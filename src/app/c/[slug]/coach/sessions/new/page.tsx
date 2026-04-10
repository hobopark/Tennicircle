export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { CreateSessionForm } from '@/components/sessions/CreateSessionForm'
import { AppNav } from '@/components/nav/AppNav'

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()
  if (!community) redirect('/communities')

  const membership = await getUserRole(supabase, community.id)
  if (!membership) redirect('/communities')
  const { role, memberId } = membership

  if (role !== 'coach' && role !== 'admin') redirect(`/c/${slug}/sessions`)

  let clients: { id: string; email: string }[] = []

  // Fetch clients assigned to this coach via coach_client_assignments
  const { data: assignments } = await supabase
    .from('coach_client_assignments')
    .select('client_member_id')
    .eq('community_id', community.id)
    .eq('coach_member_id', memberId)

  if (assignments && assignments.length > 0) {
    const clientMemberIds = assignments.map(a => a.client_member_id)
    const { data: clientMembers } = await supabase
      .from('community_members')
      .select('id, user_id')
      .in('id', clientMemberIds)

    if (clientMembers && clientMembers.length > 0) {
      const clientUserIds = clientMembers.map(c => c.user_id)
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('user_id, display_name')
        .in('user_id', clientUserIds)
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]))

      clients = clientMembers.map((c) => ({
        id: c.id,
        email: profileMap.get(c.user_id) ?? 'Client',
      }))
    }
  }

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[560px] mx-auto px-4 py-8">
          <h1 className="font-display text-[28px] font-bold text-foreground mb-6">
            Create recurring session
          </h1>
          <CreateSessionForm
            communityId={community.id}
            assignedClients={clients}
          />
        </div>
      </div>
    </>
  )
}
