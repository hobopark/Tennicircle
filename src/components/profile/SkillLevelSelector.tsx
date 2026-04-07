'use client'

import type { SkillLevel } from '@/lib/types/profiles'
import { cn } from '@/lib/utils'

interface SkillLevelSelectorProps {
  value: SkillLevel | null | undefined
  onChange: (level: SkillLevel) => void
}

const SKILL_OPTIONS: { level: SkillLevel; label: string; description: string }[] = [
  {
    level: 'beginner',
    label: 'Beginner',
    description: 'Just starting out or returning to the game',
  },
  {
    level: 'intermediate',
    label: 'Intermediate',
    description: 'Consistent rallying and match experience',
  },
  {
    level: 'advanced',
    label: 'Advanced',
    description: 'Competitive play and tournament experience',
  },
]

export function SkillLevelSelector({ value, onChange }: SkillLevelSelectorProps) {
  return (
    <fieldset className="border-none p-0 m-0">
      <legend className="sr-only">Your skill level</legend>
      <div className="flex flex-col gap-3">
        {SKILL_OPTIONS.map(({ level, label, description }) => {
          const isSelected = value === level
          return (
            <label
              key={level}
              className={cn(
                'bg-muted rounded-2xl p-4 border border-border cursor-pointer transition-colors',
                isSelected && 'border-primary bg-primary/5'
              )}
            >
              <input
                type="radio"
                name="skillLevel"
                value={level}
                checked={isSelected}
                onChange={() => onChange(level)}
                className="sr-only"
              />
              <div>
                <p className="text-base font-bold text-foreground font-heading">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
