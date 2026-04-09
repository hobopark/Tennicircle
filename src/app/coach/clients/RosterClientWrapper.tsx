'use client'

import { useRouter } from 'next/navigation'
import { RosterToggle } from '@/components/members/RosterToggle'

interface RosterClientWrapperProps {
  viewMode: 'my-clients' | 'all-members'
}

export function RosterClientWrapper({ viewMode }: RosterClientWrapperProps) {
  const router = useRouter()

  function handleToggle(value: 'my-clients' | 'all-members') {
    router.push(`/coach/clients?view=${value}`)
  }

  return <RosterToggle value={viewMode} onChange={handleToggle} />
}
