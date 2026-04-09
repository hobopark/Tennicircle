import { createClient } from '@/lib/supabase/server'
import { getJWTClaims } from '@/lib/supabase/server'
import { CreateSessionForm } from '@/components/sessions/CreateSessionForm'
import { AppNav } from '@/components/nav/AppNav'

export default async function NewSessionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const claims = await getJWTClaims(supabase)

  let clients: { id: string; email: string }[] = []

  if (user && claims.community_id) {
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (member) {
      // Fetch clients assigned to this coach with their auth user info
      const { data: clientMembers } = await supabase
        .from('community_members')
        .select('id, user_id')
        .eq('community_id', claims.community_id)
        .eq('role', 'client')
        .eq('coach_id', member.id)

      if (clientMembers) {
        // Look up emails from auth.users via admin — fallback to user_id
        // Since we can't query auth.users from anon client, use user_id as display
        // The Supabase getUser only works for the current user
        clients = clientMembers.map((c) => ({
          id: c.id,
          email: c.user_id, // Will be resolved below if possible
        }))
      }
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
            communityId={claims.community_id ?? ''}
            assignedClients={clients}
          />
        </div>
      </div>
    </>
  )
}
