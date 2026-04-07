'use client'

import { useActionState, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/actions/auth'
import type { AuthFormState } from '@/lib/types/auth'

const initialState: AuthFormState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined)

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
      {/* Email field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email" className="text-sm text-foreground">
          Email address
        </Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className={[
            'h-12 rounded-xl bg-input border border-border px-4 text-base font-sans',
            'placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring',
            displayEmailError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30' : '',
          ].join(' ')}
          onChange={handleEmailChange}
          aria-describedby={displayEmailError ? 'login-email-error' : undefined}
          aria-invalid={!!displayEmailError}
        />
        {displayEmailError && (
          <p id="login-email-error" className="text-destructive text-sm mt-1">
            {displayEmailError}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password" className="text-sm text-foreground">
          Password
        </Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          className={[
            'h-12 rounded-xl bg-input border border-border px-4 text-base font-sans',
            'placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-ring',
            displayPasswordError ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30' : '',
          ].join(' ')}
          onChange={handlePasswordChange}
          aria-describedby={displayPasswordError ? 'login-password-error' : undefined}
          aria-invalid={!!displayPasswordError}
        />
        {displayPasswordError && (
          <p id="login-password-error" className="text-destructive text-sm mt-1">
            {displayPasswordError}
          </p>
        )}
      </div>

      {/* General error banner (wrong credentials, server errors) */}
      {generalError && (
        <div className="bg-[#FFF0F0] border border-destructive text-destructive text-sm rounded-xl p-3">
          {generalError}
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-[52px] rounded-xl bg-primary text-primary-foreground text-sm font-sans hover:bg-[#265178] active:bg-[#1F4466] disabled:opacity-40 disabled:cursor-not-allowed mt-2"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-label="Logging in..." />
        ) : (
          'Log in'
        )}
      </Button>

      {/* Forgot password — deferred functionality */}
      <div className="text-right">
        <span
          className="text-sm text-muted-foreground cursor-default"
          aria-disabled="true"
          role="button"
          tabIndex={-1}
        >
          Forgot password?
        </span>
      </div>
    </form>
  )
}
