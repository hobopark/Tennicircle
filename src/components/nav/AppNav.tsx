'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShieldCheck, LayoutDashboard, CalendarDays, Calendar, Users, User, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/auth'

// Role-based nav tab definitions
const NAV_TABS: {
  href: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
}[] = [
  {
    href: '/admin',
    label: 'Admin',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    href: '/coach',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['coach'],
  },
  {
    href: '/coach/schedule',
    label: 'Schedule',
    icon: <CalendarDays className="w-5 h-5" />,
    roles: ['admin', 'coach'],
  },
  {
    href: '/sessions',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['client'],
  },
  {
    href: '/sessions/all',
    label: 'Sessions',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['client'],
  },
  {
    href: '/coach/clients',
    label: 'Clients',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin', 'coach'],
  },
  {
    href: '/events',
    label: 'Events',
    icon: <Trophy className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'],
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'],
  },
]

export function AppNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<UserRole>('pending')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]))
          setRole((payload.user_role as UserRole) || 'pending')
        } catch { /* fall through */ }
      }
    })
  }, [])

  const visibleTabs = NAV_TABS.filter(tab => tab.roles.includes(role))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 h-16">
        {visibleTabs.map(tab => {
          // Longest-match-wins: only highlight the most specific matching tab
          const matches = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const hasMoreSpecificMatch = matches && visibleTabs.some(
            other => other.href !== tab.href
              && other.href.startsWith(tab.href + '/')
              && (pathname === other.href || pathname.startsWith(other.href + '/'))
          )
          const isActive = matches && !hasMoreSpecificMatch
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={
                  isActive
                    ? 'bg-primary text-primary-foreground p-1.5 rounded-xl transition-all duration-300 shadow-sm'
                    : 'p-1.5 transition-all duration-300'
                }
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold text-primary' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
