export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { ChatRoomList } from '@/components/chat/ChatRoomList'
import { getChatRooms } from '@/lib/actions/chat'

export default async function ChatPage({
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

  const result = await getChatRooms(community.id)
  const chatrooms = result.success ? result.chatrooms ?? [] : []

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
          <h1 className="font-heading font-bold text-2xl text-foreground mb-4">Chat</h1>
          <ChatRoomList chatrooms={chatrooms} />
        </div>
      </div>
    </>
  )
}
