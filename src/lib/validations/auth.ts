import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address' }).trim(),
  password: z.string().min(1, { error: 'Password is required' }).trim(),
})

export const SignUpSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address' }).trim(),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }).trim(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SignUpInput = z.infer<typeof SignUpSchema>
