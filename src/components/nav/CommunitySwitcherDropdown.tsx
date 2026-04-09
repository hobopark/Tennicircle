'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { ChevronDown, Check } from 'lucide-react'
import { useMaybeCommunity } from '@/lib/context/community'
import { getUserCommunities } from '@/lib/actions/communities'
import { getRoleHomeRoute } from '@/lib/types/auth'
import type { UserRole } from '@/lib/types/auth'

interface Community {
  id: string
  name: string
  slug: string
  role: Exclude<UserRole, 'pending'>
}

export function CommunitySwitcherDropdown() {
  const community = useMaybeCommunity()
  const [isOpen, setIsOpen] = useState(false)
  const [allCommunities, setAllCommunities] = useState<Community[]>([])
  const [, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all communities on mount (runs regardless of community context — hooks must not be conditional)
  useEffect(() => {
    if (!community) return
    startTransition(async () => {
      const result = await getUserCommunities()
      if (result.success && result.data) {
        setAllCommunities(
          result.data.map((item) => ({
            id: item.community.id,
            name: item.community.name,
            slug: item.community.slug,
            role: item.role as Exclude<UserRole, 'pending'>,
          }))
        )
      }
    })
  // community.communityId is stable for a given page render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?.communityId])

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // If no community context (global routes), don't render — after all hooks
  if (!community) return null

  const otherCommunities = allCommunities.filter((c) => c.id !== community.communityId)

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted/80 backdrop-blur-sm text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <span className="max-w-[140px] truncate">{community.communityName}</span>
        <ChevronDown className="w-4 h-4 shrink-0" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-56 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-lg overflow-hidden z-50 opacity-100 scale-100 transition-all duration-150"
        >
          {/* Current community */}
          <div
            role="option"
            aria-selected={true}
            className="flex items-center justify-between gap-2 px-3 py-2.5 bg-primary/5 cursor-default"
          >
            <span className="text-sm font-medium text-foreground truncate">
              {community.communityName}
            </span>
            <Check className="w-4 h-4 text-primary shrink-0" />
          </div>

          {/* Other communities */}
          {otherCommunities.map((c) => (
            <Link
              key={c.id}
              href={getRoleHomeRoute(c.slug, c.role)}
              role="option"
              aria-selected={false}
              onClick={() => setIsOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span className="truncate">{c.name}</span>
            </Link>
          ))}

          {/* Separator + Browse link */}
          <div className="border-t border-border my-1" />
          <Link
            href="/communities"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Browse communities
          </Link>
        </div>
      )}
    </div>
  )
}
