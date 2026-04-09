'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { ProfileSchema, CoachAssessmentSchema, ProgressNoteSchema } from '@/lib/validations/profiles'
import type { ProfileActionResult, PlayerProfile, CoachAssessment, LessonHistoryEntry, LessonHistorySummary } from '@/lib/types/profiles'

// PROF-01: Fetch profile for given user or current user
// Community-scoped: communityId required to scope profile and assessment lookup
export async function getProfile(
  communityId: string,
  userId?: string
): Promise<{ success: boolean; data?: { profile: PlayerProfile | null; latestAssessment: CoachAssessment | null }; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  const targetUserId = userId ?? user.id

  // Fetch player profile
  const { data: profile, error: profileError } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (profileError) return { success: false, error: profileError.message }

  // Fetch the target member id for assessment lookup
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('community_id', communityId)
    .maybeSingle()

  let latestAssessment: CoachAssessment | null = null
  if (member) {
    const { data: assessment } = await supabase
      .from('coach_assessments')
      .select('*')
      .eq('subject_member_id', member.id)
      .eq('community_id', communityId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    latestAssessment = assessment as CoachAssessment | null
  }

  return {
    success: true,
    data: {
      profile: profile as PlayerProfile | null,
      latestAssessment,
    },
  }
}

// PROF-01: Upsert player profile
// communityId is now explicit — null means global profile (open sign-up, pre-community-join)
export async function upsertProfile(
  communityId: string | null,
  input: unknown
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  let parsed
  try {
    parsed = ProfileSchema.parse(input)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Invalid input' }
  }

  const profileData = {
    user_id: user.id,
    display_name: parsed.displayName,
    phone: parsed.phone ?? null,
    bio: parsed.bio ?? null,
    self_skill_level: parsed.skillLevel ?? null,
    utr: parsed.utr ?? null,
    avatar_url: parsed.avatarUrl ?? null,
    coaching_bio: parsed.coachingBio ?? null,
    updated_at: new Date().toISOString(),
  }

  if (communityId === null) {
    // Global profile (open sign-up flow, no community yet)
    // PostgREST upsert doesn't reliably handle partial unique indexes with NULL values,
    // so we use select-then-insert-or-update pattern.
    const { data: existing } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('community_id', null)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabase
        .from('player_profiles')
        .update(profileData)
        .eq('id', existing.id)
      if (updateError) return { success: false, error: updateError.message }
    } else {
      const { error: insertError } = await supabase
        .from('player_profiles')
        .insert({ ...profileData, community_id: null })
      if (insertError) return { success: false, error: insertError.message }
    }
  } else {
    // Community-specific profile (invite flow)
    const { error: upsertError } = await supabase
      .from('player_profiles')
      .upsert(
        { ...profileData, community_id: communityId },
        { onConflict: 'user_id,community_id' }
      )

    if (upsertError) return { success: false, error: upsertError.message }

    // Sync display_name to community_members
    await supabase
      .from('community_members')
      .update({ display_name: parsed.displayName })
      .eq('user_id', user.id)
      .eq('community_id', communityId)
  }

  revalidatePath('/profile')

  return { success: true }
}

// PROF-02: Coach sets skill assessment for a player
// Community-scoped: communityId + communitySlug required
export async function setCoachAssessment(
  communityId: string,
  communitySlug: string,
  input: unknown
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // Role check: only admin or coach can set assessments (T-3-01)
  if (membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'Only coaches and admins can set skill assessments' }
  }

  let parsed
  try {
    parsed = CoachAssessmentSchema.parse(input)
  } catch (err) {
    console.error('[setCoachAssessment] validation failed, input:', JSON.stringify(input), 'error:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }

  const { error: upsertError } = await supabase
    .from('coach_assessments')
    .upsert(
      {
        community_id: communityId,
        subject_member_id: parsed.subjectMemberId,
        coach_member_id: membership.memberId,
        skill_level: parsed.skillLevel,
        assessed_at: new Date().toISOString(),
      },
      { onConflict: 'community_id,subject_member_id,coach_member_id' }
    )

  if (upsertError) return { success: false, error: upsertError.message }

  revalidatePath(`/c/${communitySlug}/profile`)

  return { success: true }
}

// PROF-04: Coach adds a progress note for a session attendee
// Community-scoped: communityId + communitySlug required
export async function addProgressNote(
  communityId: string,
  communitySlug: string,
  input: unknown
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // Role check: only admin or coach can add notes (T-3-06)
  if (membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'Only coaches and admins can add progress notes' }
  }

  let parsed
  try {
    parsed = ProgressNoteSchema.parse(input)
  } catch (err) {
    console.error('[addProgressNote] validation failed, input:', JSON.stringify(input), 'error:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }

  const { error: upsertError } = await supabase
    .from('progress_notes')
    .upsert(
      {
        community_id: communityId,
        session_id: parsed.sessionId,
        subject_member_id: parsed.subjectMemberId,
        coach_member_id: membership.memberId,
        note_text: parsed.noteText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,subject_member_id,coach_member_id' }
    )

  if (upsertError) return { success: false, error: upsertError.message }

  revalidatePath(`/c/${communitySlug}/profile`)
  revalidatePath(`/c/${communitySlug}/coach/sessions/${parsed.sessionId}`)

  return { success: true }
}

// PROF-04: Update an existing progress note
// Community-scoped: communityId + communitySlug required
export async function updateProgressNote(
  communityId: string,
  communitySlug: string,
  noteId: string,
  noteText: string
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  if (membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'Only coaches and admins can update progress notes' }
  }

  if (!noteText || noteText.trim().length === 0) {
    return { success: false, error: 'Note cannot be empty' }
  }

  if (noteText.length > 2000) {
    return { success: false, error: 'Note cannot exceed 2000 characters' }
  }

  const { error } = await supabase
    .from('progress_notes')
    .update({ note_text: noteText.trim(), updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('community_id', communityId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/profile`)

  return { success: true }
}

// PROF-03: Get lesson history for a member with pagination
// Community-scoped: communityId required
export async function getLessonHistory(
  communityId: string,
  memberId: string,
  limit = 20,
  offset = 0
): Promise<{ success: boolean; data?: { entries: LessonHistoryEntry[]; summary: LessonHistorySummary }; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // Fetch confirmed non-cancelled RSVPs with session details
  const { data: rsvps, error: rsvpsError } = await supabase
    .from('session_rsvps')
    .select(`
      id,
      session_id,
      sessions (
        id,
        scheduled_at,
        venue,
        duration_minutes
      )
    `)
    .eq('member_id', memberId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (rsvpsError) return { success: false, error: rsvpsError.message }

  // Build entries with coaches and progress notes for each session
  const entries: LessonHistoryEntry[] = []

  for (const rsvp of (rsvps ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (rsvp.sessions as any) as { id: string; scheduled_at: string; venue: string; duration_minutes: number } | null
    if (!session) continue

    // Fetch coaches for this session
    const { data: coachRows } = await supabase
      .from('session_coaches')
      .select(`
        member_id,
        is_primary,
        community_members (
          display_name
        )
      `)
      .eq('session_id', session.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coaches = (coachRows ?? []).map((row: any) => ({
      member_id: row.member_id as string,
      display_name: (Array.isArray(row.community_members)
        ? row.community_members[0]?.display_name
        : row.community_members?.display_name) ?? 'Coach',
      is_primary: row.is_primary as boolean,
    }))

    // Fetch progress notes for this session + subject member
    const { data: noteRows } = await supabase
      .from('progress_notes')
      .select(`
        note_text,
        created_at,
        coach_member_id,
        community_members!coach_member_id (
          display_name
        )
      `)
      .eq('session_id', session.id)
      .eq('subject_member_id', memberId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progressNotes = (noteRows ?? []).map((row: any) => ({
      coach_name: (Array.isArray(row.community_members)
        ? row.community_members[0]?.display_name
        : row.community_members?.display_name) ?? 'Coach',
      note_text: row.note_text as string,
      created_at: row.created_at as string,
    }))

    entries.push({
      rsvp_id: rsvp.id,
      session_id: session.id,
      scheduled_at: session.scheduled_at,
      venue: session.venue,
      duration_minutes: session.duration_minutes,
      coaches,
      progress_notes: progressNotes,
    })
  }

  // Compute summary stats
  // Total confirmed non-cancelled RSVPs (no pagination limit)
  const { count: totalSessions } = await supabase
    .from('session_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  // Count distinct coaches across all attended sessions
  const { data: allRsvps } = await supabase
    .from('session_rsvps')
    .select('session_id')
    .eq('member_id', memberId)
    .eq('rsvp_type', 'confirmed')
    .is('cancelled_at', null)

  const sessionIds = (allRsvps ?? []).map((r: { session_id: string }) => r.session_id)
  let uniqueCoaches = 0

  if (sessionIds.length > 0) {
    const { data: coachData } = await supabase
      .from('session_coaches')
      .select('member_id')
      .in('session_id', sessionIds)

    const uniqueCoachIds = new Set((coachData ?? []).map((c: { member_id: string }) => c.member_id))
    uniqueCoaches = uniqueCoachIds.size
  }

  // Member since: joined_at from community_members
  const { data: memberData } = await supabase
    .from('community_members')
    .select('joined_at')
    .eq('id', memberId)
    .maybeSingle()

  const summary: LessonHistorySummary = {
    total_sessions: totalSessions ?? 0,
    unique_coaches: uniqueCoaches,
    member_since: memberData?.joined_at ?? new Date().toISOString(),
  }

  return { success: true, data: { entries, summary } }
}
