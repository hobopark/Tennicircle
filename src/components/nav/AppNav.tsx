'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/auth'

// Role-based nav link visibility per D-14
const NAV_LINKS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: '/admin', label: 'Admin', roles: ['admin'] },
  { href: '/coach', label: 'Schedule', roles: ['admin', 'coach'] },
  { href: '/sessions', label: 'Sessions', roles: ['client', 'admin'] },
]

export function AppNav() {
  const [role, setRole] = useState<UserRole>('pending')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setRole((user.app_metadata?.user_role as UserRole) || 'pending')
      }
    })
  }, [])

  const visibleLinks = NAV_LINKS.filter(link => link.roles.includes(role))

  return (
    <nav className="w-full bg-popover border-b border-border px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/welcome" className="font-display text-base font-bold text-foreground">
          TenniCircle
        </Link>
        <div className="flex items-center gap-4">
          {visibleLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
