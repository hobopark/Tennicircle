export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { getChatRoomMessages, getChatRoomDetails } from '@/lib/actions/chat'
import { ChatRoom } from '@/components/chat/ChatRoom'

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ slug: string; chatroomId: string }>
}) {
  const { slug, chatroomId } = await params
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

  // Fetch chatroom details + members
  const details = await getChatRoomDetails(chatroomId)
  if (!details.success || !details.chatroom) redirect(`/c/${slug}/chat`)

  // Fetch initial messages
  const messagesResult = await getChatRoomMessages(chatroomId)
  const initialMessages = messagesResult.success ? messagesResult.messages ?? [] : []

  const currentMember = details.members?.find(m => m.id === membership.memberId)
  const isManager = currentMember?.chatroomRole === 'manager'

  return (
    <ChatRoom
      chatroomId={chatroomId}
      chatroomName={details.chatroom.name}
      isManager={isManager}
      members={details.members ?? []}
      initialMessages={initialMessages}
    />
  )
}
