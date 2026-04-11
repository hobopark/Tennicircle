'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { SkillLevelSelector } from '@/components/profile/SkillLevelSelector'
import { upsertProfile } from '@/lib/actions/profiles'
import type { PlayerProfile } from '@/lib/types/profiles'
import type { ProfileInput } from '@/lib/validations/profiles'

interface ProfileSetupWizardProps {
  existingProfile: PlayerProfile | null
  email: string
  communityId: string | null
  userId: string
  userRole: string
}

const PLAYER_STEPS = ['identity', 'contact', 'avatar', 'skill'] as const
const COACH_STEPS = ['identity', 'contact', 'avatar', 'coaching'] as const
type Step = 'identity' | 'contact' | 'avatar' | 'skill' | 'coaching'

const STEP_LABELS: Record<Step, string> = {
  identity: 'Identity',
  contact: 'Contact',
  avatar: 'Avatar',
  skill: 'Skill',
  coaching: 'Coaching',
}

export function ProfileSetupWizard({
  existingProfile,
  email,
  communityId,
  userId,
  userRole,
}: ProfileSetupWizardProps) {
  const router = useRouter()
  const isEditing = existingProfile !== null
  const isCoach = userRole === 'coach' || userRole === 'admin'
  const STEPS = isCoach ? COACH_STEPS : PLAYER_STEPS

  const [currentStep, setCurrentStep] = useState<number>(0)
  const [formData, setFormData] = useState<Partial<ProfileInput>>({
    displayName: existingProfile?.display_name ?? '',
    phone: existingProfile?.phone ?? '',
    bio: existingProfile?.bio ?? '',
    skillLevel: existingProfile?.self_skill_level ?? undefined,
    utr: existingProfile?.utr ?? undefined,
    avatarUrl: existingProfile?.avatar_url ?? undefined,
    coachingBio: existingProfile?.coaching_bio ?? undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, setIsPending] = useState(false)

  function handleFieldChange(field: keyof ProfileInput, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validateCurrentStep(): boolean {
    if (currentStep === 0) {
      if (!formData.displayName || formData.displayName.trim() === '') {
        setErrors(prev => ({ ...prev, displayName: 'Name is required' }))
        return false
      }
    }
    return true
  }

  async function handleContinue() {
    if (!validateCurrentStep()) return

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      await handleSubmit()
    }
  }

  function handleSkip() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Final step skip: still submit with current data
      void handleSubmit()
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  async function handleSubmit() {
    setIsPending(true)
    try {
      // Parse UTR: convert string to number if needed
      const utrValue = typeof formData.utr === 'string' && formData.utr !== ''
        ? parseFloat(formData.utr as string)
        : formData.utr

      const submitData = {
        ...formData,
        utr: utrValue && !isNaN(utrValue as number) ? utrValue : undefined,
      }

      const result = await upsertProfile(communityId, submitData)

      if (result.success) {
        toast.success('Profile saved')
        router.push('/profile')
      } else {
        toast.error(result.error ?? 'Something went wrong saving your profile. Please try again.')
      }
    } finally {
      setIsPending(false)
    }
  }

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-background p-5 sm:max-w-[440px] sm:w-full sm:bg-card sm:rounded-3xl sm:border sm:border-border/50 sm:shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-8"
    >
      {/* Step indicator */}
      <div className="flex items-center mb-8" role="list" aria-label="Setup progress">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStep
          const isActive = i === currentStep
          const isUpcoming = i > currentStep

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div
                role="listitem"
                aria-label={`Step ${i + 1} of 4: ${STEP_LABELS[step]}`}
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300',
                  isCompleted ? 'bg-muted text-muted-foreground' : '',
                  isActive ? 'bg-accent text-accent-foreground font-heading font-bold ring-2 ring-primary/30' : '',
                  isUpcoming ? 'bg-muted text-muted-foreground opacity-40' : '',
                ].join(' ')}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm">{i + 1}</span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 border-t border-border mx-1" />
              )}
            </div>
          )
        })}
      </div>

      {/* Heading */}
      <h1 className="font-heading font-bold text-2xl mb-6">
        {isEditing ? 'Edit your profile' : 'Set up your profile'}
      </h1>

      {/* Step content */}
      <div className="flex flex-col gap-4">
        {/* Step 0: Identity */}
        {currentStep === 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                className="h-12"
                value={formData.displayName ?? ''}
                onChange={e => handleFieldChange('displayName', e.target.value)}
                placeholder="Your name"
                aria-required="true"
                aria-invalid={!!errors.displayName}
              />
              {errors.displayName && (
                <p className="text-destructive text-sm mt-1">{errors.displayName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">Bio <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="bio"
                value={formData.bio ?? ''}
                onChange={e => handleFieldChange('bio', e.target.value)}
                placeholder="Tell coaches about yourself..."
                maxLength={500}
              />
            </div>
          </>
        )}

        {/* Step 1: Contact */}
        {currentStep === 1 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="phone"
                type="tel"
                className="h-12"
                value={formData.phone ?? ''}
                onChange={e => handleFieldChange('phone', e.target.value)}
                placeholder="+61 400 000 000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                value={email}
                disabled
                className="h-12 bg-muted"
                aria-label="Email address (from your account)"
              />
            </div>
          </>
        )}

        {/* Step 2: Avatar */}
        {currentStep === 2 && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              {formData.avatarUrl ? null : (
                <InitialsAvatar name={formData.displayName ?? ''} />
              )}
              <AvatarUpload
                communityId={communityId}
                userId={userId}
                currentAvatarUrl={formData.avatarUrl ?? null}
                displayName={formData.displayName ?? ''}
                onAvatarChange={url => handleFieldChange('avatarUrl', url)}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Upload a photo or use your initials
            </p>
          </div>
        )}

        {/* Step 3: Skill (players only) */}
        {currentStep === 3 && !isCoach && (
          <>
            <SkillLevelSelector
              value={formData.skillLevel}
              onChange={level => handleFieldChange('skillLevel', level)}
            />
            <div className="flex flex-col gap-1.5 mt-2">
              <Label htmlFor="utr">UTR (Universal Tennis Rating)</Label>
              <Input
                id="utr"
                type="number"
                step="0.01"
                min="1"
                max="16.5"
                className="h-12"
                placeholder="e.g. 4.50"
                value={formData.utr ?? ''}
                onChange={e => handleFieldChange('utr', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Optional. Used in Australian competitive tennis.
              </p>
            </div>
          </>
        )}

        {/* Step 3: Coaching bio (coaches/admins only) */}
        {currentStep === 3 && isCoach && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coachingBio">Coaching bio &amp; specialties</Label>
            <Textarea
              id="coachingBio"
              value={formData.coachingBio ?? ''}
              onChange={e => handleFieldChange('coachingBio', e.target.value)}
              placeholder="Your coaching experience, qualifications, and specialties..."
              maxLength={500}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              This appears on your profile so players know your background.
            </p>
          </div>
        )}
      </div>

      {/* Primary action button */}
      <div className="mt-8">
        <Button
          onClick={handleContinue}
          disabled={isPending}
          className="w-full h-12 rounded-2xl font-heading font-bold"
        >
          {isPending && <Loader2 className="animate-spin mr-2" size={16} />}
          {isLastStep
            ? isEditing
              ? 'Save changes'
              : 'Save profile'
            : 'Continue'}
        </Button>
      </div>

      {/* Skip link (steps 1-3) */}
      {currentStep > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:underline"
          >
            I&apos;ll do this later
          </button>
        </div>
      )}

      {/* Back button (steps 1-3) */}
      {currentStep > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-muted-foreground hover:underline"
          >
            Back
          </button>
        </div>
      )}
    </motion.div>
  )
}
