# AceHub Design Reference

Extracted from Base44 prototype app (AceHub) — the target visual direction for TenniCircle.

## Design Philosophy
- **Mobile-first** with bottom tab navigation
- **Young & modern** — bold colors, rounded cards, smooth animations
- **Glassmorphic** elements — backdrop blur on nav, cards with subtle borders
- **Tennis court vibes** — fresh green primary with warm secondary accents

## Fonts
- **Heading:** Space Grotesk, sans-serif (`--font-heading`)
- **Body:** Inter, sans-serif (`--font-body`)
- Google Fonts import: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap`

## Color System (HSL)

### Light Theme (:root)
| Token | HSL | Role |
|-------|-----|------|
| `--background` | 60 10% 98% | Page background (warm off-white) |
| `--foreground` | 160 20% 8% | Primary text (dark green-tinted) |
| `--card` | 0 0% 100% | Card surface (pure white) |
| `--card-foreground` | 160 20% 8% | Card text |
| `--primary` | 152 65% 42% | Primary green (tennis court) |
| `--primary-foreground` | 0 0% 100% | White text on primary |
| `--secondary` | 45 100% 58% | Warm yellow-orange accent |
| `--secondary-foreground` | 160 20% 8% | Text on secondary |
| `--accent` | 152 30% 92% | Subtle green tint |
| `--accent-foreground` | 152 65% 25% | Dark green for accents |
| `--muted` | 150 10% 94% | Muted backgrounds |
| `--muted-foreground` | 160 10% 45% | Muted text |
| `--destructive` | 0 84.2% 60.2% | Error red |
| `--border` | 150 12% 90% | Subtle borders |
| `--input` | 150 12% 90% | Input borders |
| `--ring` | 152 65% 42% | Focus ring (matches primary) |
| `--radius` | 1rem | Base border radius |

### Dark Theme (.dark)
| Token | HSL | Role |
|-------|-----|------|
| `--background` | 160 15% 6% | Dark background |
| `--foreground` | 60 10% 96% | Light text |
| `--card` | 160 15% 9% | Dark card surface |
| `--primary` | 152 65% 48% | Slightly brighter green |
| `--secondary` | 45 100% 58% | Same warm accent |
| `--accent` | 152 20% 15% | Darker green accent |
| `--muted` | 160 10% 14% | Dark muted |
| `--destructive` | 0 62.8% 30.6% | Dark mode error |

## Component Patterns

### Cards
- `bg-card rounded-3xl border border-border/50 overflow-hidden`
- Active/tap: `active:scale-[0.98] transition-transform`
- Image containers: `relative h-32 bg-muted` or `h-36`
- Gradient fallback when no image: `bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20`

### Badges / Tags
- Level badge: `text-[10px] font-medium px-2 py-0.5 rounded-full`
- Type tag: `text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full`
- Price pill: `text-xs font-bold bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-primary`
- FREE badge: `text-xs font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full`

### Level Colors (lesson cards)
- Beginner: green-tinted
- Intermediate: primary color
- Advanced: warm/secondary tinted

### Bottom Navigation
- Fixed: `fixed bottom-0 left-0 right-0 z-50`
- Glass effect: `bg-card/80 backdrop-blur-xl border-t border-border`
- Safe area: `safe-area-inset-bottom` considered
- Active tab: `text-primary` with `bg-primary/10` icon background
- Inactive tab: `text-muted-foreground`
- Icon container: `p-1.5 rounded-xl transition-all duration-300`
- Label: `text-[10px] font-medium`, bold when active

### Quick Action Cards
- Grid: 3 columns
- Card: `rounded-2xl p-4 flex flex-col items-center gap-2`
- Background: gradient e.g. `from-primary/20 to-primary/5`
- Icon: lucide-react icons (`w-6 h-6`)

### Section Headers
- Title: `font-heading font-bold text-base`
- "See all" link: `text-sm font-medium text-primary` with chevron

### Animations
- Uses `framer-motion` for entrance animations
- Pattern: `initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}`
- Stagger: `transition={{ delay: 0.1 }}`

### Profile Page
- Avatar: `w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5` with tennis emoji
- Name: `font-heading font-bold text-xl`
- Email: `text-sm text-muted-foreground`
- Settings button: `w-10 h-10 rounded-xl bg-muted`
- Stats grid: `grid grid-cols-3 gap-3 mb-8`
- Stat card: `bg-card rounded-2xl border border-border/50 p-4 text-center`
- Stat value: `font-heading font-bold text-xl`
- Stat label: `text-[10px] text-muted-foreground font-medium`

### Home Page
- Greeting: `text-sm text-muted-foreground` ("G'day 👋")
- Name: `font-heading font-bold text-2xl`
- Search bar: `bg-muted rounded-2xl px-4 py-3` with search icon
- Featured banner: full-width rounded card with gradient overlay, pill tags
- Page padding: `px-5 pt-14 pb-4`

### Typography Scale
- Display heading (home name): `font-heading font-bold text-2xl`
- Card title: `font-heading font-bold text-base`
- Card subtitle: `text-sm text-muted-foreground`
- Small/label: `text-xs text-muted-foreground`
- Micro text: `text-[10px] font-medium`

## Key Differences from Current TenniCircle
1. **Color palette**: Green primary (HSL 152 65% 42%) instead of warm brown/cream
2. **Fonts**: Space Grotesk + Inter instead of Nunito Sans
3. **Card style**: 3xl rounded corners, subtle borders, glassmorphic elements
4. **Animations**: Framer Motion entrance animations throughout
5. **Layout**: Mobile-first with bottom tab nav pattern
6. **Overall feel**: Fresh, sporty, young vs. warm/cozy
