import { CreateSessionForm } from '@/components/sessions/CreateSessionForm'

export default function NewSessionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <h1 className="font-display text-[28px] font-bold text-foreground mb-6">
          Create recurring session
        </h1>
        <CreateSessionForm />
      </div>
    </div>
  )
}
