'use client'

import Link from 'next/link'
import { Trophy, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/auth'
import { ROLE_HOME_ROUTES } from '@/lib/types/auth'
import { AppNav } from '@/components/nav/AppNav'
import { joinCommunityAsClient } from '@/lib/actions/members'
import { toast } from 'sonner'

export function WelcomePage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>('pending')
  const [joining, setJoining] = useState(false)

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

  // MGMT-04: Auto-join pending users as clients in the single community
  useEffect(() => {
    if (role !== 'pending' || joining) return

    async function autoJoin() {
      setJoining(true)
      const result = await joinCommunityAsClient()
      if (result.success) {
        // Refresh session to get new JWT with community claims
        const supabase = createClient()
        await supabase.auth.refreshSession()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]))
            const newRole = (payload.user_role as UserRole) || 'pending'
            setRole(newRole)
          } catch { /* fall through */ }
        }
      } else if (result.error === 'Already a community member') {
        // Already joined — refresh to get correct role
        const supabase = createClient()
        await supabase.auth.refreshSession()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]))
            setRole((payload.user_role as UserRole) || 'pending')
          } catch { /* fall through */ }
        }
      } else {
        toast.error(result.error ?? 'Failed to join community')
      }
      setJoining(false)
    }

    autoJoin()
  }, [role, joining])

  function handleSkip() {
    if (role !== 'pending' && role in ROLE_HOME_ROUTES) {
      router.push(ROLE_HOME_ROUTES[role as Exclude<UserRole, 'pending'>])
    }
  }

  return (
    <>
      <AppNav />
      <div className="bg-background min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] mx-auto bg-popover sm:rounded-2xl sm:shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-8">
          {joining ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="text-primary animate-spin" />
              <p className="text-sm text-muted-foreground mt-4">Joining community...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Trophy size={40} className="text-primary" />
              <h1 className="font-display text-[28px] font-bold text-foreground text-center mt-4">
                You&apos;re in!
              </h1>
              <p className="text-base text-muted-foreground text-center mt-2">
                Set up your profile to get the most out of TenniCircle.
              </p>
              <Link
                href="/profile/setup"
                className="mt-8 w-full flex items-center justify-center h-[52px] rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[#265178] active:bg-[#1F4466] transition-colors"
              >
                Set up my profile
              </Link>
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground text-center mt-4 cursor-pointer hover:underline"
              >
                I&apos;ll do this later
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
