'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { setCoachAssessment } from '@/lib/actions/profiles'
import { useCommunity } from '@/lib/context/community'
import type { SkillLevel } from '@/lib/types/profiles'

interface CoachAssessmentWidgetProps {
  subjectMemberId: string
  currentLevel: SkillLevel | null
}

const SKILL_LEVELS: { value: SkillLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out or returning to the game' },
  { value: 'intermediate', label: 'Intermediate', description: 'Consistent rallying and match experience' },
  { value: 'advanced', label: 'Advanced', description: 'Competitive play and tournament experience' },
]

function skillBadgeClass(level: SkillLevel | null): string {
  if (!level) return 'bg-muted text-muted-foreground'
  if (level === 'beginner') return 'bg-accent text-accent-foreground ring-2 ring-primary'
  if (level === 'intermediate') return 'bg-primary/10 text-primary ring-2 ring-primary'
  return 'bg-secondary/20 text-secondary-foreground ring-2 ring-primary'
}

export function CoachAssessmentWidget({ subjectMemberId, currentLevel }: CoachAssessmentWidgetProps) {
  const { communityId, communitySlug } = useCommunity()
  const [expanded, setExpanded] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>(currentLevel ?? 'beginner')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await setCoachAssessment(communityId, communitySlug, { subjectMemberId, skillLevel: selectedLevel })
      if (result.success) {
        toast.success('Assessment updated')
        setExpanded(false)
      } else {
        toast.error(result.error ?? "Couldn't save the assessment. Please try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-5 items-center justify-center rounded-full px-2 py-0.5 text-sm font-medium ${skillBadgeClass(currentLevel)}`}
        >
          {currentLevel
            ? currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)
            : 'Not yet assessed'}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          aria-expanded={expanded}
          className="text-sm text-primary font-bold"
        >
          Update assessment
        </button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-col gap-3">
          <fieldset>
            <legend className="sr-only">Skill level assessment</legend>
            <div className="flex flex-col gap-2">
              {SKILL_LEVELS.map(level => (
                <label
                  key={level.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                    selectedLevel === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="skill-level"
                    value={level.value}
                    checked={selectedLevel === level.value}
                    onChange={() => setSelectedLevel(level.value)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground font-heading">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="h-10 rounded-xl text-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                'Save assessment'
              )}
            </Button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
