'use client'

import { useActionState, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/lib/actions/auth'
import type { AuthFormState } from '@/lib/types/auth'

const initialState: AuthFormState = {}

interface SignUpFormProps {
  onSignUpSuccess: (email: string) => void
}

export function SignUpForm({ onSignUpSuccess }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState(signup, initialState)
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined)
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''

  // When signup succeeds, notify parent to show verification pending state
  useEffect(() => {
    if (state.success && state.message) {
      onSignUpSuccess(state.message)
    }
  }, [state.success, state.message, onSignUpSuccess])

  // Merge server-side field errors with locally cleared errors
  const displayEmailError = emailError !== undefined ? emailError : state.errors?.email?.[0]
  const displayPasswordError = passwordError !== undefined ? passwordError : state.errors?.password?.[0]
  const generalError = state.errors?.general?.[0]

  function handleEmailChange() {
    setEmailError('')
  }

  function handlePasswordChange() {
    setPasswordError('')
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Hidden invite token — threaded from URL per D-06/D-07 */}
      <input type="hidden" name="invite_token" value={inviteToken} />

      {/* Email field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Email address
        </Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className={[
            'h-12 rounded-xl bg-muted/50 border border-border/60 px-4 text-base font-sans',
            'placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-white',
            'transition-all duration-200',
            displayEmailError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30' : '',
          ].join(' ')}
          onChange={handleEmailChange}
          aria-describedby={displayEmailError ? 'signup-email-error' : undefined}
          aria-invalid={!!displayEmailError}
        />
        {displayEmailError && (
          <p id="signup-email-error" className="text-destructive text-sm mt-1">
            {displayEmailError}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Create a password
        </Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className={[
            'h-12 rounded-xl bg-muted/50 border border-border/60 px-4 text-base font-sans',
            'placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-white',
            'transition-all duration-200',
            displayPasswordError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30' : '',
          ].join(' ')}
          onChange={handlePasswordChange}
          aria-describedby={displayPasswordError ? 'signup-password-error' : undefined}
          aria-invalid={!!displayPasswordError}
        />
        {displayPasswordError && (
          <p id="signup-password-error" className="text-destructive text-sm mt-1">
            {displayPasswordError}
          </p>
        )}
      </div>

      {/* General error banner */}
      {generalError && (
        <div className="bg-[#FFF0F0] border border-destructive text-destructive text-sm rounded-xl p-3">
          {generalError}
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-[52px] rounded-xl bg-primary text-primary-foreground text-sm font-sans font-semibold uppercase tracking-wide hover:bg-court active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-3 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-label="Creating account..." />
        ) : (
          'Create account'
        )}
      </Button>

      {/* Terms helper text */}
      <p className="text-xs text-muted-foreground/70 text-center">
        By signing up, you agree to our terms.
      </p>
    </form>
  )
}
