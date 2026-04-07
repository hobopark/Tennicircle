'use client'

import Link from 'next/link'
import { Settings, Phone, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { CoachAssessmentWidget } from '@/components/profile/CoachAssessmentWidget'
import type { PlayerProfile, CoachAssessment, SkillLevel } from '@/lib/types/profiles'
import type { UserRole } from '@/lib/types/auth'

interface ProfileViewProps {
  profile: PlayerProfile
  coachAssessment: CoachAssessment | null
  isOwnProfile: boolean
  viewerRole: UserRole
  memberId: string
  email: string
}

function selfSkillBadgeClass(level: SkillLevel | null): string {
  if (!level) return 'bg-muted text-muted-foreground'
  if (level === 'beginner') return 'bg-accent text-accent-foreground'
  if (level === 'intermediate') return 'bg-primary/10 text-primary'
  return 'bg-secondary/20 text-secondary-foreground'
}

function coachSkillBadgeClass(level: SkillLevel | null): string {
  if (!level) return 'bg-muted text-muted-foreground'
  if (level === 'beginner') return 'bg-accent text-accent-foreground ring-2 ring-primary'
  if (level === 'intermediate') return 'bg-primary/10 text-primary ring-2 ring-primary'
  return 'bg-secondary/20 text-secondary-foreground ring-2 ring-primary'
}

function formatMemberSince(isoDate: string): string {
  return new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(
    new Date(isoDate)
  )
}

export function ProfileView({
  profile,
  coachAssessment,
  isOwnProfile,
  viewerRole,
  memberId,
  email,
}: ProfileViewProps) {
  const isCoachOrAdmin = viewerRole === 'admin' || viewerRole === 'coach'

  const cards = [
    // Profile header card
    <div
      key="header"
      className="bg-card rounded-3xl border border-border/50 p-6 mb-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              className="w-16 h-16 rounded-2xl object-cover"
              alt={`${profile.display_name ?? 'User'}'s avatar`}
            />
          ) : (
            <InitialsAvatar name={profile.display_name ?? 'User'} size={64} />
          )}
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              {profile.display_name ?? 'Unknown'}
            </h1>
            {profile.created_at && (
              <p className="text-sm text-muted-foreground">
                Member since {formatMemberSince(profile.created_at)}
              </p>
            )}
          </div>
        </div>
        {isOwnProfile && (
          <Link
            href="/profile/setup"
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Edit profile"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </Link>
        )}
      </div>
    </div>,

    // Skill levels card
    <div
      key="skills"
      className="bg-card rounded-3xl border border-border/50 p-6 mb-4"
    >
      <h2 className="font-heading font-bold text-base mb-3">Skill Level</h2>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Self-assessed</p>
          <span
            className={`inline-flex h-5 items-center justify-center rounded-full px-2 py-0.5 text-sm font-medium ${selfSkillBadgeClass(profile.self_skill_level)}`}
          >
            {profile.self_skill_level
              ? profile.self_skill_level.charAt(0).toUpperCase() + profile.self_skill_level.slice(1)
              : 'Not set'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-foreground">Coach assessment</p>
          {isCoachOrAdmin && !isOwnProfile ? (
            <CoachAssessmentWidget
              subjectMemberId={memberId}
              currentLevel={coachAssessment?.skill_level ?? null}
            />
          ) : (
            <span
              className={`inline-flex h-5 items-center justify-center rounded-full px-2 py-0.5 text-sm font-medium ${coachSkillBadgeClass(coachAssessment?.skill_level ?? null)}`}
            >
              {coachAssessment?.skill_level
                ? coachAssessment.skill_level.charAt(0).toUpperCase() +
                  coachAssessment.skill_level.slice(1)
                : 'Not yet assessed'}
            </span>
          )}
        </div>
      </div>
      {profile.utr != null && (
        <p className="text-sm text-muted-foreground mt-3">UTR: {profile.utr}</p>
      )}
    </div>,

    // Contact info card (coaches/admins, or own profile)
    ...(isCoachOrAdmin || isOwnProfile
      ? [
          <div
            key="contact"
            className="bg-card rounded-3xl border border-border/50 p-6 mb-4"
          >
            <h2 className="font-heading font-bold text-base mb-3">Contact</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  {profile.phone ?? 'No phone added'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{email}</span>
              </div>
            </div>
          </div>,
        ]
      : []),

    // Bio card
    <div
      key="bio"
      className="bg-card rounded-3xl border border-border/50 p-6 mb-4"
    >
      <h2 className="font-heading font-bold text-base mb-3">About</h2>
      {profile.bio ? (
        <p className="text-base text-foreground">{profile.bio}</p>
      ) : isOwnProfile ? (
        <p className="text-sm text-muted-foreground italic">
          Add a bio to introduce yourself to your coaches and community.
        </p>
      ) : null}
      {profile.coaching_bio && (
        <div className="mt-4">
          <h3 className="font-heading font-bold text-sm mb-2 text-foreground">
            Coaching bio &amp; specialties
          </h3>
          <p className="text-base text-foreground">{profile.coaching_bio}</p>
        </div>
      )}
    </div>,
  ]

  return (
    <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {card}
        </motion.div>
      ))}
    </div>
  )
}
