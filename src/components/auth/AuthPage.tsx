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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-[15vh] px-4">
      {/* TenniCircle wordmark */}
      <p className="font-display text-[20px] font-bold text-foreground text-center mb-12">
        TenniCircle
      </p>

      {/* Auth card */}
      <div className="w-full max-w-[440px] bg-popover p-6 sm:p-8 sm:rounded-2xl sm:shadow-[0_2px_12px_rgba(0,0,0,0.08)]">

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
            <h1 className="font-display text-[20px] font-bold text-foreground mb-4">
              {heading}
            </h1>

            {/* Tab switcher */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="w-full bg-card rounded-xl h-11 mb-6 p-1">
                <TabsTrigger
                  value="login"
                  className="flex-1 text-sm font-sans data-active:bg-popover data-active:text-foreground text-muted-foreground rounded-lg"
                >
                  Log in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 text-sm font-sans data-active:bg-popover data-active:text-foreground text-muted-foreground rounded-lg"
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
