'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, LayoutDashboard, CalendarDays, Calendar, Users, User, Trophy, Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/auth'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
    href: '/sessions/calendar',
    label: 'Calendar',
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
    href: '/notifications',
    label: 'Notifications',
    icon: <Bell className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'] as UserRole[],
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
  const router = useRouter()
  const [role, setRole] = useState<UserRole>('pending')
  const [unreadCount, setUnreadCount] = useState(0)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]))
          setRole((payload.user_role as UserRole) || 'pending')
        } catch { /* fall through */ }

        // Fetch member_id for notification queries
        const { data: memberData } = await supabase
          .from('community_members')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (memberData) {
          setMemberId(memberData.id)
          // Fetch unread notification count
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', memberData.id)
            .is('read_at', null)

          setUnreadCount(count ?? 0)
        }
      }
    })
  }, [])

  // Realtime subscription for live badge updates
  useEffect(() => {
    if (!memberId) return

    const supabase = createClient()
    const channel = supabase
      .channel('nav-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `member_id=eq.${memberId}`,
        },
        () => {
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `member_id=eq.${memberId}`,
        },
        () => {
          // Re-fetch count on any update (mark-as-read)
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', memberId)
            .is('read_at', null)
            .then(({ count }) => setUnreadCount(count ?? 0))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [memberId])

  const visibleTabs = NAV_TABS.filter(tab => tab.roles.includes(role))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
      {/* Logout button — fixed top right */}
      <button
        type="button"
        onClick={() => setShowLogout(true)}
        aria-label="Log out"
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-xl bg-muted/80 backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        <LogOut className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Log out?</DialogTitle>
          <DialogDescription>You&apos;ll be returned to the sign-in screen.</DialogDescription>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleLogout}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                {tab.href === '/notifications' ? (
                  <span className="relative">
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
                        style={{ backgroundColor: '#c8e030', color: '#1a1a1a' }}
                        aria-label={`${unreadCount > 9 ? '9+' : unreadCount} unread notifications`}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                ) : (
                  tab.icon
                )}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold text-primary' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
    </>
  )
}
