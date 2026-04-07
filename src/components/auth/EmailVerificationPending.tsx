'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN_SECONDS = 60

interface EmailVerificationPendingProps {
  email: string
}

export function EmailVerificationPending({ email }: EmailVerificationPendingProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [hasResent, setHasResent] = useState(false)

  // Count down the cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownRemaining])

  const handleResend = useCallback(async () => {
    if (cooldownRemaining > 0) return

    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })

    setHasResent(true)
    setCooldownRemaining(RESEND_COOLDOWN_SECONDS)
  }, [email, cooldownRemaining])

  const isOnCooldown = cooldownRemaining > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Check your email heading */}
      <h1 className="font-display text-[20px] font-bold text-foreground">
        Check your email
      </h1>

      {/* Verification body */}
      <p className="text-base text-foreground leading-relaxed">
        We sent a confirmation link to{' '}
        <strong className="font-bold">{email}</strong>. Click it to activate your account.
      </p>

      {/* Resend helper */}
      <p className="text-sm text-muted-foreground">
        Didn&apos;t get it? Check your spam folder or{' '}
        {isOnCooldown ? (
          <span className="text-muted-foreground">
            resend in {cooldownRemaining}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-primary underline-offset-2 hover:underline cursor-pointer"
          >
            {hasResent ? 'resend the email' : 'resend the email'}
          </button>
        )}
      </p>
    </div>
  )
}
