'use client'

interface RosterToggleProps {
  value: 'my-clients' | 'all-members'
  onChange: (value: 'my-clients' | 'all-members') => void
}

export function RosterToggle({ value, onChange }: RosterToggleProps) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
      <button
        onClick={() => onChange('my-clients')}
        className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
          value === 'my-clients'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        My clients
      </button>
      <button
        onClick={() => onChange('all-members')}
        className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${
          value === 'all-members'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        All members
      </button>
    </div>
  )
}
