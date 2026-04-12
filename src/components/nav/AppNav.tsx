'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, LayoutDashboard, CalendarDays, Calendar, Users, User, Trophy, Bell, MessageCircle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMaybeCommunity } from '@/lib/context/community'
import { CommunitySwitcherDropdown } from '@/components/nav/CommunitySwitcherDropdown'
import { getPendingRequests } from '@/lib/actions/communities'
import { getTotalUnreadChatCount } from '@/lib/actions/chat'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/types/auth'

// Role-based nav tab definitions — paths are relative sub-paths after /c/{slug}
const NAV_TABS: {
  subPath: string
  label: string
  icon: React.ReactNode
  roles: Exclude<UserRole, 'pending'>[]
}[] = [
  {
    subPath: '/admin',
    label: 'Admin',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    subPath: '/coach',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['coach'],
  },
  {
    subPath: '/coach/schedule',
    label: 'Schedule',
    icon: <CalendarDays className="w-5 h-5" />,
    roles: ['admin', 'coach'],
  },
  {
    subPath: '/sessions',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['client'],
  },
  {
    subPath: '/sessions/calendar',
    label: 'Calendar',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['client'],
  },
  {
    subPath: '/coach/clients',
    label: 'Clients',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin', 'coach'],
  },
  {
    subPath: '/events',
    label: 'Events',
    icon: <Trophy className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'],
  },
  {
    subPath: '/chat',
    label: 'Chat',
    icon: <MessageCircle className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'],
  },
  {
    subPath: '/notifications',
    label: 'Notifications',
    icon: <Bell className="w-5 h-5" />,
    roles: ['admin', 'coach', 'client'],
  },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Safe community context — null on global routes like /profile
  const community = useMaybeCommunity()
  const communitySlug = community?.communitySlug
  const role = community?.role

  // Only fetch member ID when in community context (for notification badge)
  useEffect(() => {
    if (!community) return
    const supabase = createClient()
    supabase
      .from('community_members')
      .select('id')
      .eq('id', community.membershipId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMemberId(data.id)
          // Fetch initial unread count
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('member_id', data.id)
            .is('read_at', null)
            .then(({ count }) => setUnreadCount(count ?? 0))
        }
      })
  }, [community?.membershipId])

  // Fetch pending join request count for Clients tab badge
  useEffect(() => {
    if (!community) {
      setPendingCount(0)
      return
    }
    if (community.role !== 'admin' && community.role !== 'coach') return
    getPendingRequests(community.communityId).then(result => {
      if (result.success && result.data) setPendingCount(result.data.length)
    })
  }, [community?.communityId, community?.role])

  // Poll chat unread count every 30s
  useEffect(() => {
    if (!community) {
      setChatUnreadCount(0)
      return
    }
    const fetchChatUnread = () => {
      getTotalUnreadChatCount(community.communityId).then(count => setChatUnreadCount(count))
    }
    fetchChatUnread()
    const interval = setInterval(fetchChatUnread, 30_000)
    return () => clearInterval(interval)
  }, [community?.communityId])

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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  // Active path check using longest-match-wins with slug-based paths
  const isActive = (subPath: string) => {
    if (!communitySlug) return false
    const fullPath = `/c/${communitySlug}${subPath}`
    return pathname === fullPath || pathname.startsWith(fullPath + '/')
  }

  // Determine visible tabs based on role (only in community context)
  const visibleTabs = community && role
    ? NAV_TABS.filter(tab => tab.roles.includes(role))
    : []

  // In community context: resolve active tab with longest-match-wins
  const activeTabPaths = visibleTabs
    .map(tab => ({ subPath: tab.subPath, active: isActive(tab.subPath) }))
    .filter(t => t.active)

  // Find which tabs have a more-specific match active (suppress parent tabs)
  const hasMoreSpecificActiveTab = (subPath: string) => {
    return activeTabPaths.some(
      t => t.subPath !== subPath
        && t.subPath.startsWith(subPath + '/')
    )
  }

  return (
    <>
      {/* Top bar — community switcher + logout */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <CommunitySwitcherDropdown />
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          aria-label="Log out"
          className="w-9 h-9 rounded-xl bg-muted/80 backdrop-blur-sm flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of TenniCircle?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setShowLogoutDialog(false); handleLogout() }}>
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-2 h-16">
          {community && role ? (
            // Community context: show role-based tabs
            visibleTabs.map(tab => {
              const active = isActive(tab.subPath) && !hasMoreSpecificActiveTab(tab.subPath)
              const href = `/c/${communitySlug}${tab.subPath}`
              return (
                <Link
                  key={tab.subPath}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 flex-1 py-2 ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    className={
                      active
                        ? 'bg-primary text-primary-foreground p-1.5 rounded-xl transition-all duration-300 shadow-md shadow-primary/25'
                        : 'p-1.5 transition-all duration-300'
                    }
                  >
                    {tab.subPath === '/notifications' ? (
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
                    ) : tab.subPath === '/coach/clients' ? (
                      <span className="relative">
                        <Users className="w-5 h-5" aria-hidden="true" />
                        {pendingCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5"
                            aria-label={`${pendingCount} pending join request${pendingCount !== 1 ? 's' : ''}`}
                          >
                            {pendingCount > 9 ? '9+' : pendingCount}
                          </span>
                        )}
                      </span>
                    ) : tab.subPath === '/chat' ? (
                      <span className="relative">
                        <MessageCircle className="w-5 h-5" aria-hidden="true" />
                        {chatUnreadCount > 0 && (
                          <span
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
                            style={{ backgroundColor: '#c8e030', color: '#1a1a1a' }}
                            aria-label={`${chatUnreadCount > 9 ? '9+' : chatUnreadCount} unread messages`}
                          >
                            {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                          </span>
                        )}
                      </span>
                    ) : (
                      tab.icon
                    )}
                  </span>
                  <span className={`text-[10px] ${active ? 'font-bold text-primary' : ''}`}>
                    {tab.label}
                  </span>
                </Link>
              )
            })
          ) : (
            // Minimal nav for global routes (/profile, /profile/setup, /communities)
            <>
              <Link
                href="/communities"
                className={`flex flex-col items-center gap-0.5 flex-1 py-2 ${
                  pathname === '/communities' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className={
                  pathname === '/communities'
                    ? 'bg-primary text-primary-foreground p-1.5 rounded-xl transition-all duration-300 shadow-md shadow-primary/25'
                    : 'p-1.5 transition-all duration-300'
                }>
                  <LayoutDashboard className="w-5 h-5" />
                </span>
                <span className={`text-[10px] ${pathname === '/communities' ? 'font-bold text-primary' : ''}`}>
                  Communities
                </span>
              </Link>
              <Link
                href="/profile"
                className={`flex flex-col items-center gap-0.5 flex-1 py-2 ${
                  pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className={
                  pathname.startsWith('/profile')
                    ? 'bg-primary text-primary-foreground p-1.5 rounded-xl transition-all duration-300 shadow-md shadow-primary/25'
                    : 'p-1.5 transition-all duration-300'
                }>
                  <User className="w-5 h-5" />
                </span>
                <span className={`text-[10px] ${pathname.startsWith('/profile') ? 'font-bold text-primary' : ''}`}>
                  Profile
                </span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
