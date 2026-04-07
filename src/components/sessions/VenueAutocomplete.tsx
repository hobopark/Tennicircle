'use client'

import { useState, useRef } from 'react'
import { Popover } from '@base-ui/react/popover'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'

interface VenueAutocompleteProps {
  value: string
  onChange: (value: string) => void
  communityId: string
  error?: string
}

export function VenueAutocomplete({ value, onChange, communityId, error }: VenueAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchSuggestions(inputValue: string) {
    if (!inputValue || inputValue.length < 1) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('session_templates')
      .select('venue')
      .eq('community_id', communityId)
      .ilike('venue', `%${inputValue}%`)
      .limit(5)

    if (data) {
      const unique = [...new Set(data.map((row: { venue: string }) => row.venue).filter(Boolean))]
      setSuggestions(unique)
      setIsOpen(unique.length > 0)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    onChange(newValue)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 200)
  }

  function handleSelect(suggestion: string) {
    onChange(suggestion)
    setSuggestions([])
    setIsOpen(false)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
  }

  return (
    <div className="relative">
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          render={
            <Input
              value={value}
              onChange={handleInputChange}
              placeholder="e.g. Moore Park Tennis Club"
              aria-label="Venue"
              className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          }
          nativeButton={false}
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} align="start" style={{ zIndex: 50, width: 'var(--anchor-width, 100%)' }}>
            <Popover.Popup className="rounded-lg border border-border bg-popover py-1 shadow-md">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                  onMouseDown={(e) => {
                    // Prevent blur before click registers
                    e.preventDefault()
                    handleSelect(suggestion)
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
