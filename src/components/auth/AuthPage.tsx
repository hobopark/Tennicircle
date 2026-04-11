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
      <p className="font-display text-2xl font-bold text-primary text-center mb-12">
        TenniCircle
      </p>

      {/* Auth card */}
      <div className="w-full max-w-[440px] bg-popover p-6 sm:p-8 sm:rounded-2xl sm:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)]">

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
              <TabsList className="w-full bg-muted/50 rounded-2xl h-12 mb-6 p-1">
                <TabsTrigger
                  value="login"
                  className="flex-1 text-sm font-sans rounded-xl h-10 text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md"
                >
                  Log in
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 text-sm font-sans rounded-xl h-10 text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md"
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
