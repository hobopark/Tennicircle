'use client'

import Link from 'next/link'
import { getRoleHomeRoute } from '@/lib/types/auth'
import type { UserRole } from '@/lib/types/auth'

interface CommunityCardProps {
  community: {
    id: string
    name: string
    slug: string
    description: string | null
    memberCount: number
  }
  role: Exclude<UserRole, 'pending'>
}

const roleBadgeStyles: Record<Exclude<UserRole, 'pending'>, string> = {
  admin: 'bg-primary/10 text-primary',
  coach: 'bg-secondary/30 text-secondary-foreground',
  client: 'bg-muted text-muted-foreground',
}

export function CommunityCard({ community, role }: CommunityCardProps) {
  const href = getRoleHomeRoute(community.slug, role)

  return (
    <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all duration-200">
      {/* Top row: name + role badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading font-bold text-base leading-tight">
          {community.name}
        </span>
        <span
          className={`text-[10px] font-normal px-2 py-0.5 rounded-full shrink-0 capitalize ${roleBadgeStyles[role]}`}
          aria-label={`Your role: ${role}`}
        >
          {role}
        </span>
      </div>

      {/* Middle row: member count */}
      <p className="text-sm text-muted-foreground">
        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
      </p>

      {/* Bottom row: Go to Community link */}
      <Link
        href={href}
        className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 mt-1"
        aria-label={`Go to ${community.name}`}
      >
        Go to Community
      </Link>
    </div>
  )
}
