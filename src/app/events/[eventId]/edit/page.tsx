import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { EditEventForm } from '@/components/events/EditEventForm'

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function EditEventPage({ params }: PageProps) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const claims = await getJWTClaims(supabase)
  const userRole = claims.user_role ?? 'client'

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!member) notFound()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  // Only creator or admin can edit
  if (event.created_by !== member.id && userRole !== 'admin') {
    redirect(`/events/${eventId}`)
  }

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Event
          </Link>

          <h1 className="font-heading font-bold text-2xl mb-6">Edit Event</h1>

          <EditEventForm event={event} eventId={eventId} />
        </div>
      </div>
    </>
  )
}
