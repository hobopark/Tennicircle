'use server'

import { createClient } from '@/lib/supabase/server'
import { LoginSchema, SignUpSchema } from '@/lib/validations/auth'
import type { AuthFormState } from '@/lib/types/auth'
import { redirect } from 'next/navigation'

export async function login(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validated = LoginSchema.safeParse(rawData)
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors
    return {
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error) {
    // Map Supabase errors to user-facing messages (T-01-03-03: generic messages only)
    // Preserve email so the field stays populated on retry
    if (error.message.includes('Invalid login credentials')) {
      return {
        errors: {
          general: ['Incorrect email or password. Please try again.'],
        },
        values: { email: validated.data.email },
      }
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        errors: {
          general: ['Please verify your email before logging in. Check your inbox.'],
        },
        values: { email: validated.data.email },
      }
    }
    return {
      errors: {
        general: ['Something went wrong. Please try again in a moment.'],
      },
      values: { email: validated.data.email },
    }
  }

  redirect('/communities')
}

export async function signup(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validated = SignUpSchema.safeParse(rawData)
  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors
    return {
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    }
  }

  const supabase = await createClient()

  // Get invite token from form if present (passed from URL query param per D-06/D-07)
  const inviteToken = formData.get('invite_token') as string | null

  const redirectUrl = new URL('/auth/confirm', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  if (inviteToken) {
    redirectUrl.searchParams.set('invite', inviteToken)
  }

  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      emailRedirectTo: redirectUrl.toString(),
    },
  })

  if (error) {
    console.error('[signup] Supabase error:', error.message, error.status, error.name)
    if (
      error.message.includes('already registered') ||
      error.message.includes('already been registered')
    ) {
      return {
        errors: {
          general: ['An account with this email already exists. Try logging in.'],
        },
      }
    }
    return {
      errors: {
        general: [`Sign up failed: ${error.message}`],
      },
    }
  }

  return {
    success: true,
    message: validated.data.email, // Pass email to show in verification pending UI (D-04)
  }
}
