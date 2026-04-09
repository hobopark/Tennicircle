import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProviderWrapper } from '@/lib/context/community'
import type { UserRole } from '@/lib/types/auth'

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params // MUST await params (Next.js 16)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Single combined query: community + membership + role
  const { data: membership } = await supabase
    .from('community_members')
    .select('id, role, communities!inner(id, name, slug)')
    .eq('user_id', user.id)
    .eq('communities.slug', slug)
    .maybeSingle()

  if (!membership) redirect('/communities')

  const community = membership.communities as unknown as { id: string; name: string; slug: string }

  return (
    <CommunityProviderWrapper
      communityId={community.id}
      communitySlug={community.slug}
      communityName={community.name}
      membershipId={membership.id}
      role={membership.role as Exclude<UserRole, 'pending'>}
    >
      {children}
    </CommunityProviderWrapper>
  )
}
