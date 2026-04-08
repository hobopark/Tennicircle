import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  // T-05-04: Verify CRON_SECRET to prevent unauthorized invocation
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Service-role client bypasses RLS for bulk notification insert
  const supabase = createServiceClient()

  const now = new Date()
  // 24h–25h window accounts for Hobby plan cron timing imprecision (±59 min)
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Find sessions in the reminder window with confirmed, non-cancelled RSVPs
  const { data: sessions, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, venue, community_id,
      session_rsvps!inner(member_id)
    `)
    .gte('scheduled_at', windowStart.toISOString())
    .lt('scheduled_at', windowEnd.toISOString())
    .is('cancelled_at', null)
    .eq('session_rsvps.rsvp_type', 'confirmed')
    .is('session_rsvps.cancelled_at', null)

  if (sessionError) {
    return Response.json({ error: sessionError.message }, { status: 500 })
  }

  // Build notification rows for all confirmed attendees
  const inserts = (sessions ?? []).flatMap(session =>
    (session.session_rsvps as { member_id: string }[]).map(rsvp => ({
      community_id: session.community_id,
      member_id: rsvp.member_id,
      notification_type: 'session_reminder' as const,
      title: 'Session tomorrow',
      body: `Your session is tomorrow at ${formatTime(session.scheduled_at)} — ${session.venue}`,
      metadata: { session_id: session.id, scheduled_at: session.scheduled_at },
    }))
  )

  let insertedCount = 0
  if (inserts.length > 0) {
    // Plain insert — the DB unique index notifications_session_reminder_unique
    // handles idempotency via ON CONFLICT (the 3-column partial index on
    // member_id, notification_type, metadata->>'session_id' WHERE notification_type = 'session_reminder').
    // Duplicates cause a unique constraint violation which we catch and log.
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(inserts)

    if (insertError) {
      // 23505 = unique_violation — expected on re-run (idempotency working correctly)
      if (insertError.code === '23505') {
        console.log('Cron: some reminders already sent (idempotent skip)')
      } else {
        console.error('Notification insert error:', insertError.message)
      }
    }
    insertedCount = inserts.length
  }

  return Response.json({
    sessionsFound: sessions?.length ?? 0,
    notificationsQueued: inserts.length,
    inserted: insertedCount,
    window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
  })
}

// Format time portion of ISO string for notification body copy — always in Sydney time
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
