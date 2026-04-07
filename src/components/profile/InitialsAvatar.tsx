import { cn } from '@/lib/utils'

interface InitialsAvatarProps {
  name: string
  size?: number
  className?: string
}

export function InitialsAvatar({ name, size = 80, className }: InitialsAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      aria-label={`Avatar for ${name}`}
      role="img"
      className={cn(
        'flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 select-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span className="font-heading font-bold text-base text-primary">
        {initials || '?'}
      </span>
    </div>
  )
}
