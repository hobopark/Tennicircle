'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import type { PickerMember } from '@/lib/types/chat'

interface MemberPickerProps {
  members: PickerMember[]
  selected: string[]
  onChange: (selected: string[]) => void
  excludeIds?: string[]
}

export function MemberPicker({ members, selected, onChange, excludeIds = [] }: MemberPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const excluded = new Set(excludeIds)
    return members
      .filter(m => !excluded.has(m.id))
      .filter(m => {
        if (!search) return true
        const name = (m.display_name ?? '').toLowerCase()
        return name.includes(search.toLowerCase())
      })
  }, [members, search, excludeIds])

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
        )}
        {filtered.map(m => {
          const isSelected = selected.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
                isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {m.avatar_url ? (
                  <Image
                    src={m.avatar_url}
                    width={32}
                    height={32}
                    alt={m.display_name ?? ''}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <InitialsAvatar
                    name={m.display_name ?? '?'}
                    size={32}
                    className="rounded-full"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.display_name ?? 'Unknown'}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
