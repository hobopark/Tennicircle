import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditSessionForm } from '@/components/sessions/EditSessionForm'

export default async function EditSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <h1 className="font-display text-[28px] font-bold text-foreground mb-6">Edit session</h1>
        <EditSessionForm session={session} templateId={session.template_id} />
      </div>
    </div>
  )
}
