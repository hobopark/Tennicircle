export interface ChatRoom {
  id: string
  community_id: string
  name: string
  created_by: string | null
  created_at: string
}

export interface ChatRoomMember {
  id: string
  chatroom_id: string
  member_id: string
  role: 'manager' | 'member'
  joined_at: string
}

export interface ChatMessage {
  id: string
  chatroom_id: string
  sender_id: string | null
  content: string | null
  image_url: string | null
  created_at: string
}

export interface ChatReadCursor {
  id: string
  chatroom_id: string
  member_id: string
  last_read_at: string
}

/** Chatroom list item with computed fields for display */
export interface ChatRoomListItem {
  id: string
  name: string
  created_by: string | null
  created_at: string
  memberCount: number
  lastMessage: {
    content: string | null
    image_url: string | null
    sender_name: string | null
    created_at: string
  } | null
  unreadCount: number
}

/** Message with sender profile info for rendering */
export interface ChatMessageWithSender extends ChatMessage {
  sender: {
    display_name: string | null
    avatar_url: string | null
    member_id: string
  } | null
}

/** Community member for the member picker */
export interface PickerMember {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: string
  user_id: string
  chatroomRole?: 'manager' | 'member'
}
