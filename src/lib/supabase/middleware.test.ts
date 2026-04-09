import { describe, it } from 'vitest'

describe('proxy decision tree', () => {
  it.todo('unauthenticated user on protected route redirects to /auth')
  it.todo('authenticated user on /auth redirects to /communities')
  it.todo('user without profile redirects to /profile/setup')
  it.todo('user on /communities passes through')
  it.todo('user on old flat route with 1 community redirects to /c/[slug]')
  it.todo('user on old flat route with 0 or 2+ communities redirects to /communities')
  it.todo('user on /c/[slug] without membership redirects to /communities')
  it.todo('user on /c/[slug] with wrong role redirects to role home')
})
