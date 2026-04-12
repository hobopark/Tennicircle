'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  ChatRoomListItem,
  ChatMessageWithSender,
  PickerMember,
} from '@/lib/types/chat'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMemberId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('community_members')
    .select('id, community_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  return member ? { userId: user.id, memberId: member.id, communityId: member.community_id } : null
}

async function getMemberIdForCommunity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  return member ? { userId: user.id, memberId: member.id } : null
}

// ---------------------------------------------------------------------------
// Create chatroom
// ---------------------------------------------------------------------------

export async function createChatRoom(
  communityId: string,
  communitySlug: string,
  name: string,
  memberIds: string[]
): Promise<{ success: boolean; chatroomId?: string; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberIdForCommunity(supabase, communityId)
  if (!auth) return { success: false, error: 'Not authenticated' }

  const trimmedName = name.trim()
  if (!trimmedName) return { success: false, error: 'Name is required' }

  // Generate ID client-side so we can add members before SELECT policy kicks in
  const chatroomId = crypto.randomUUID()

  // Create the chatroom (no .select() — SELECT policy requires membership which doesn't exist yet)
  const { error: createError } = await supabase
    .from('chatrooms')
    .insert({
      id: chatroomId,
      community_id: communityId,
      name: trimmedName,
      created_by: auth.memberId,
    })

  if (createError) return { success: false, error: createError.message }

  // Add creator first as manager (must exist before adding others, for RLS)
  const { error: creatorError } = await supabase
    .from('chatroom_members')
    .insert({ chatroom_id: chatroomId, member_id: auth.memberId, role: 'manager' })

  if (creatorError) return { success: false, error: creatorError.message }

  // Add other selected members
  const otherMemberIds = memberIds.filter(id => id !== auth.memberId)
  if (otherMemberIds.length > 0) {
    const otherRows = otherMemberIds.map(mid => ({
      chatroom_id: chatroomId,
      member_id: mid,
      role: 'member',
    }))
    const { error: membersError } = await supabase
      .from('chatroom_members')
      .insert(otherRows)

    if (membersError) return { success: false, error: membersError.message }
  }

  const allMemberIds = [...new Set([auth.memberId, ...memberIds])]

  // Initialize read cursors for all members
  const cursorRows = allMemberIds.map(mid => ({
    chatroom_id: chatroomId,
    member_id: mid,
    last_read_at: new Date().toISOString(),
  }))

  await supabase.from('chat_read_cursors').insert(cursorRows)

  revalidatePath(`/c/${communitySlug}/chat`)
  return { success: true, chatroomId }
}

// ---------------------------------------------------------------------------
// Rename chatroom (manager only)
// ---------------------------------------------------------------------------

export async function renameChatRoom(
  communitySlug: string,
  chatroomId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  const trimmedName = newName.trim()
  if (!trimmedName) return { success: false, error: 'Name is required' }

  // RLS ensures only manager can update
  const { error } = await supabase
    .from('chatrooms')
    .update({ name: trimmedName })
    .eq('id', chatroomId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/chat`)
  revalidatePath(`/c/${communitySlug}/chat/${chatroomId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Toggle manager role (promote/demote)
// ---------------------------------------------------------------------------

export async function toggleChatRoomManager(
  communitySlug: string,
  chatroomId: string,
  memberId: string,
  makeManager: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  // Verify caller is a manager (RLS on chatroom_members update isn't set up, so check manually)
  const { data: callerMembership } = await supabase
    .from('chatroom_members')
    .select('role')
    .eq('chatroom_id', chatroomId)
    .eq('member_id', auth.memberId)
    .single()

  if (callerMembership?.role !== 'manager') return { success: false, error: 'Only managers can do this' }

  const { error } = await supabase
    .from('chatroom_members')
    .update({ role: makeManager ? 'manager' : 'member' })
    .eq('chatroom_id', chatroomId)
    .eq('member_id', memberId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/chat/${chatroomId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Add members (manager only)
// ---------------------------------------------------------------------------

export async function addChatRoomMembers(
  communitySlug: string,
  chatroomId: string,
  memberIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  if (memberIds.length === 0) return { success: false, error: 'No members selected' }

  const rows = memberIds.map(mid => ({
    chatroom_id: chatroomId,
    member_id: mid,
  }))

  // RLS ensures only manager can insert
  const { error } = await supabase
    .from('chatroom_members')
    .upsert(rows, { onConflict: 'chatroom_id,member_id', ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }

  // Initialize cursors for new members
  const cursorRows = memberIds.map(mid => ({
    chatroom_id: chatroomId,
    member_id: mid,
    last_read_at: new Date().toISOString(),
  }))
  await supabase
    .from('chat_read_cursors')
    .upsert(cursorRows, { onConflict: 'chatroom_id,member_id', ignoreDuplicates: true })

  revalidatePath(`/c/${communitySlug}/chat/${chatroomId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Remove member (manager only)
// ---------------------------------------------------------------------------

export async function removeChatRoomMember(
  communitySlug: string,
  chatroomId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  // Prevent manager from removing themselves
  if (memberId === auth.memberId) return { success: false, error: 'Cannot remove yourself' }

  // RLS ensures only manager can delete
  const { error } = await supabase
    .from('chatroom_members')
    .delete()
    .eq('chatroom_id', chatroomId)
    .eq('member_id', memberId)

  if (error) return { success: false, error: error.message }

  // Clean up read cursor
  await supabase
    .from('chat_read_cursors')
    .delete()
    .eq('chatroom_id', chatroomId)
    .eq('member_id', memberId)

  revalidatePath(`/c/${communitySlug}/chat/${chatroomId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

export async function sendMessage(
  chatroomId: string,
  content: string | null,
  imageUrl: string | null
): Promise<{ success: boolean; message?: { id: string; created_at: string }; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  if (!content?.trim() && !imageUrl) return { success: false, error: 'Message cannot be empty' }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chatroom_id: chatroomId,
      sender_id: auth.memberId,
      content: content?.trim() || null,
      image_url: imageUrl || null,
    })
    .select('id, created_at')
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, message: data }
}

// ---------------------------------------------------------------------------
// Get chatroom messages (paginated)
// ---------------------------------------------------------------------------

export async function getChatRoomMessages(
  chatroomId: string,
  before?: string,
  limit = 50
): Promise<{ success: boolean; messages?: ChatMessageWithSender[]; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  let query = supabase
    .from('chat_messages')
    .select('id, chatroom_id, sender_id, content, image_url, created_at')
    .eq('chatroom_id', chatroomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data: messages, error } = await query

  if (error) return { success: false, error: error.message }
  if (!messages || messages.length === 0) return { success: true, messages: [] }

  // Fetch sender profiles
  const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))] as string[]

  const { data: members } = senderIds.length > 0
    ? await supabase
        .from('community_members')
        .select('id, display_name, user_id')
        .in('id', senderIds)
    : { data: [] }

  const memberUserIds = (members ?? []).map(m => m.user_id).filter(Boolean)
  const { data: profiles } = memberUserIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', memberUserIds)
    : { data: [] }

  const profileByUserId = new Map((profiles ?? []).map(p => [p.user_id, p]))
  const memberMap = new Map((members ?? []).map(m => {
    const profile = profileByUserId.get(m.user_id)
    return [m.id, {
      display_name: profile?.display_name ?? m.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      member_id: m.id,
    }]
  }))

  const enriched: ChatMessageWithSender[] = messages.map(m => ({
    ...m,
    sender: m.sender_id ? memberMap.get(m.sender_id) ?? null : null,
  }))

  return { success: true, messages: enriched }
}

// ---------------------------------------------------------------------------
// Update read cursor
// ---------------------------------------------------------------------------

export async function updateReadCursor(
  chatroomId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('chat_read_cursors')
    .upsert(
      {
        chatroom_id: chatroomId,
        member_id: auth.memberId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'chatroom_id,member_id' }
    )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Get total unread chat count (for nav badge)
// ---------------------------------------------------------------------------

export async function getTotalUnreadChatCount(
  communityId: string
): Promise<number> {
  const supabase = await createClient()
  const auth = await getMemberIdForCommunity(supabase, communityId)
  if (!auth) return 0

  // Get all chatrooms the user belongs to
  const { data: memberships } = await supabase
    .from('chatroom_members')
    .select('chatroom_id')
    .eq('member_id', auth.memberId)

  if (!memberships || memberships.length === 0) return 0

  const chatroomIds = memberships.map(m => m.chatroom_id)

  // Get read cursors
  const { data: cursors } = await supabase
    .from('chat_read_cursors')
    .select('chatroom_id, last_read_at')
    .eq('member_id', auth.memberId)
    .in('chatroom_id', chatroomIds)

  const cursorMap = new Map((cursors ?? []).map(c => [c.chatroom_id, c.last_read_at]))

  // Count unread per chatroom
  let total = 0
  for (const chatroomId of chatroomIds) {
    const lastRead = cursorMap.get(chatroomId)
    let query = supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('chatroom_id', chatroomId)

    if (lastRead) {
      query = query.gt('created_at', lastRead)
    }

    const { count } = await query
    total += count ?? 0
  }

  return total
}

// ---------------------------------------------------------------------------
// Get chatrooms for list page
// ---------------------------------------------------------------------------

export async function getChatRooms(
  communityId: string
): Promise<{ success: boolean; chatrooms?: ChatRoomListItem[]; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberIdForCommunity(supabase, communityId)
  if (!auth) return { success: false, error: 'Not authenticated' }

  // Get chatrooms the user belongs to
  const { data: memberships } = await supabase
    .from('chatroom_members')
    .select('chatroom_id')
    .eq('member_id', auth.memberId)

  if (!memberships || memberships.length === 0) return { success: true, chatrooms: [] }

  const chatroomIds = memberships.map(m => m.chatroom_id)

  // Fetch chatroom details
  const { data: chatrooms } = await supabase
    .from('chatrooms')
    .select('id, name, created_by, created_at')
    .in('id', chatroomIds)

  if (!chatrooms) return { success: true, chatrooms: [] }

  // Member counts per chatroom
  const { data: allMembers } = await supabase
    .from('chatroom_members')
    .select('chatroom_id')
    .in('chatroom_id', chatroomIds)

  const memberCounts = new Map<string, number>()
  for (const m of allMembers ?? []) {
    memberCounts.set(m.chatroom_id, (memberCounts.get(m.chatroom_id) ?? 0) + 1)
  }

  // Last message per chatroom
  const lastMessages = new Map<string, { content: string | null; image_url: string | null; sender_id: string | null; created_at: string }>()
  for (const id of chatroomIds) {
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('content, image_url, sender_id, created_at')
      .eq('chatroom_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (msgs && msgs.length > 0) {
      lastMessages.set(id, msgs[0])
    }
  }

  // Resolve sender names for last messages
  const senderIds = [...new Set(
    Array.from(lastMessages.values()).map(m => m.sender_id).filter(Boolean)
  )] as string[]

  const { data: senderMembers } = senderIds.length > 0
    ? await supabase.from('community_members').select('id, display_name, user_id').in('id', senderIds)
    : { data: [] }

  const senderUserIds = (senderMembers ?? []).map(m => m.user_id).filter(Boolean)
  const { data: senderProfiles } = senderUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', senderUserIds)
    : { data: [] }

  const profileByUserId = new Map((senderProfiles ?? []).map(p => [p.user_id, p.display_name]))
  const senderNameMap = new Map(
    (senderMembers ?? []).map(m => [m.id, profileByUserId.get(m.user_id) ?? m.display_name ?? null])
  )

  // Read cursors for unread counts
  const { data: cursors } = await supabase
    .from('chat_read_cursors')
    .select('chatroom_id, last_read_at')
    .eq('member_id', auth.memberId)
    .in('chatroom_id', chatroomIds)

  const cursorMap = new Map((cursors ?? []).map(c => [c.chatroom_id, c.last_read_at]))

  // Build list items with unread counts
  const items: ChatRoomListItem[] = []
  for (const room of chatrooms) {
    const lastMsg = lastMessages.get(room.id)
    const lastRead = cursorMap.get(room.id)

    let unreadCount = 0
    if (lastMsg) {
      let query = supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chatroom_id', room.id)

      if (lastRead) {
        query = query.gt('created_at', lastRead)
      }

      const { count } = await query
      unreadCount = count ?? 0
    }

    items.push({
      id: room.id,
      name: room.name,
      created_by: room.created_by,
      created_at: room.created_at,
      memberCount: memberCounts.get(room.id) ?? 0,
      lastMessage: lastMsg ? {
        content: lastMsg.content,
        image_url: lastMsg.image_url,
        sender_name: lastMsg.sender_id ? senderNameMap.get(lastMsg.sender_id) ?? null : null,
        created_at: lastMsg.created_at,
      } : null,
      unreadCount,
    })
  }

  // Sort by last message time (most recent first), rooms with no messages at the end
  items.sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? a.created_at
    const bTime = b.lastMessage?.created_at ?? b.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  return { success: true, chatrooms: items }
}

// ---------------------------------------------------------------------------
// Get chatroom details (for chatroom view header + management)
// ---------------------------------------------------------------------------

export async function getChatRoomDetails(
  chatroomId: string
): Promise<{
  success: boolean
  chatroom?: { id: string; name: string; created_by: string | null }
  members?: PickerMember[]
  error?: string
}> {
  const supabase = await createClient()
  const auth = await getMemberId(supabase)
  if (!auth) return { success: false, error: 'Not authenticated' }

  const { data: chatroom } = await supabase
    .from('chatrooms')
    .select('id, name, created_by')
    .eq('id', chatroomId)
    .single()

  if (!chatroom) return { success: false, error: 'Chatroom not found' }

  // Get members with profiles and chatroom roles
  const { data: chatMembers } = await supabase
    .from('chatroom_members')
    .select('member_id, role')
    .eq('chatroom_id', chatroomId)

  const chatroomRoleMap = new Map((chatMembers ?? []).map(m => [m.member_id, m.role as 'manager' | 'member']))
  const memberIds = (chatMembers ?? []).map(m => m.member_id)

  const { data: members } = memberIds.length > 0
    ? await supabase
        .from('community_members')
        .select('id, display_name, role, user_id')
        .in('id', memberIds)
    : { data: [] }

  const userIds = (members ?? []).map(m => m.user_id).filter(Boolean)
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))

  const enrichedMembers: PickerMember[] = (members ?? []).map(m => {
    const profile = profileMap.get(m.user_id)
    return {
      id: m.id,
      display_name: profile?.display_name ?? m.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: m.role,
      user_id: m.user_id,
      chatroomRole: chatroomRoleMap.get(m.id) ?? 'member',
    }
  })

  return { success: true, chatroom, members: enrichedMembers }
}

// ---------------------------------------------------------------------------
// Get community members for picker (when creating/managing chatroom)
// ---------------------------------------------------------------------------

export async function getCommunityMembersForPicker(
  communityId: string
): Promise<{ success: boolean; members?: PickerMember[]; error?: string }> {
  const supabase = await createClient()
  const auth = await getMemberIdForCommunity(supabase, communityId)
  if (!auth) return { success: false, error: 'Not authenticated' }

  const { data: members } = await supabase
    .from('community_members')
    .select('id, display_name, role, user_id')
    .eq('community_id', communityId)

  if (!members) return { success: true, members: [] }

  const userIds = members.map(m => m.user_id).filter(Boolean)
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]))

  const enriched: PickerMember[] = members.map(m => {
    const profile = profileMap.get(m.user_id)
    return {
      id: m.id,
      display_name: profile?.display_name ?? m.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: m.role,
      user_id: m.user_id,
    }
  })

  return { success: true, members: enriched }
}
