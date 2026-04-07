'use client'

import { useState, useRef } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={value}
        onChange={handleInputChange}
        onBlur={() => {
          // Delay closing so click on suggestion registers
          setTimeout(() => setIsOpen(false), 150)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true)
        }}
        placeholder="e.g. Moore Park Tennis Club"
        aria-label="Venue"
        autoComplete="off"
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover py-1 shadow-md">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(suggestion)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
