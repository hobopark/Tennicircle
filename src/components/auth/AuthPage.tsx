'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { EmailVerificationPending } from '@/components/auth/EmailVerificationPending'

type ActiveTab = 'login' | 'signup'

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login')
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [sessionExpiredError, setSessionExpiredError] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      setSessionExpiredError(true)
    }
  }, [searchParams])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as ActiveTab)
    setVerificationEmail(null)
    setSessionExpiredError(false)
  }, [])

  const handleSignUpSuccess = useCallback((email: string) => {
    setVerificationEmail(email)
  }, [])

  const heading = activeTab === 'login' ? 'Welcome back' : 'Join TenniCircle'
  const subline = activeTab === 'login' ? 'Pick up where you left off' : 'Start your tennis journey today'

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center pt-[12vh] px-4">
      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332] animate-gradient-shift" />

      {/* Court-pattern grid overlay */}
      <div className="absolute inset-0 court-pattern-light" />

      {/* Decorative glow orb — top right (gold) */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#C9A84C]/15 blur-3xl animate-pulse-slow" />

      {/* Decorative glow orb — bottom left (green) */}
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#52B788]/15 blur-3xl animate-pulse-slow" />

      {/* Vertical center-line accent (court net line) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

      {/* Brand lockup */}
      <div className="relative z-10 flex flex-col items-center mb-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-3">
          {/* SVG tennis ball — left */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="opacity-80">
            <circle cx="14" cy="14" r="13" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
            <path d="M4 8c4 4 4 8 0 12" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M24 8c-4 4-4 8 0 12" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gradient-gold tracking-tight">
            TenniCircle
          </h1>
          {/* SVG tennis ball — right */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="opacity-80">
            <circle cx="14" cy="14" r="13" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
            <path d="M4 8c4 4 4 8 0 12" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M24 8c-4 4-4 8 0 12" stroke="#C9A84C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-sans text-sm uppercase tracking-[0.2em] text-white/60 mb-3">
          Your Court. Your Community.
        </p>
        {/* Gold divider accent */}
        <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      </div>

      {/* Auth card — glassmorphic */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/90 dark:bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/30 dark:border-white/10 animate-fade-in-up [animation-delay:150ms]">

        {verificationEmail ? (
          <EmailVerificationPending email={verificationEmail} />
        ) : (
          <>
            {/* Session expired banner */}
            {sessionExpiredError && (
              <div className="mb-4 bg-[#FFF0F0] border border-destructive text-destructive text-sm rounded-xl p-3">
                Your session expired. Please log in again.
              </div>
            )}

            {/* Card heading — changes with active tab */}
            <h1 className="font-heading text-2xl font-bold text-primary mb-1">
              {heading}
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              {subline}
            </p>

            {/* Tab switcher */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="w-full bg-[#1B4332]/5 rounded-2xl h-12 mb-6 p-1">
                <TabsTrigger
                  value="login"
                  className="flex-1 text-sm font-sans font-semibold rounded-xl h-10 text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-lg data-active:shadow-primary/25"
                >
                  Log in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 text-sm font-sans font-semibold rounded-xl h-10 text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-lg data-active:shadow-primary/25"
                >
                  Sign up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm key="login-form" />
              </TabsContent>

              <TabsContent value="signup">
                <SignUpForm
                  key="signup-form"
                  onSignUpSuccess={handleSignUpSuccess}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
