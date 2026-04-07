# Phase 3: Player Profiles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 03-player-profiles
**Areas discussed:** Profile content & setup, Skill level system, Lesson history display, Coach progress notes

---

## Profile content & setup

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated setup wizard | Multi-step setup after first login: name, contact, avatar, bio, skill level. WelcomePage becomes the entry point. | ✓ |
| Single profile page | One editable profile page — no wizard. | |
| Inline progressive | No dedicated setup. Fields appear contextually as needed. | |

**User's choice:** Dedicated setup wizard
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Upload photo | User uploads photo, stored in Supabase Storage. Cropper for square framing. Fallback to initials avatar. | ✓ |
| Initials only | Auto-generated initials avatar from name. No upload. | |
| Upload + presets | Photo upload plus preset tennis-themed avatars. | |

**User's choice:** Upload photo
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Phone + email display | Phone number field + email auto-populated from auth. Coaches can see player contact info. | ✓ |
| Email only | Just the email from sign-up. No additional contact fields. | |
| Phone + email + social | Phone, email, plus optional social links. | |

**User's choice:** Phone + email display
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Same base, coach extras | All users have the same profile fields. Coaches additionally see a 'My Players' section and coaching bio/specialties. | ✓ |
| Identical profiles | Same profile for everyone regardless of role. | |
| Separate profile types | Distinct coach and player profile templates with different fields. | |

**User's choice:** Same base, coach extras
**Notes:** None

---

## Skill level system

| Option | Description | Selected |
|--------|-------------|----------|
| 1.0–7.0 NTRP-style | Half-point increments. Familiar to tennis players. | |
| Beginner/Inter/Advanced | Simple 3–5 tier labels. Less granular but simpler. | ✓ (modified) |
| 1–10 numeric | Simple numeric scale. Not tennis-specific. | |

**User's choice:** Beginner/Intermediate/Advanced tiers + separate optional UTR rating field
**Notes:** UTR (Universal Tennis Rating) is what's used in Australia. User wants both a simple tier and an optional UTR numeric field.

| Option | Description | Selected |
|--------|-------------|----------|
| Both visible side-by-side | Player sees both self-assessment and coach assessment on profile. Coach assessment shown as "official." | ✓ |
| Coach overrides self | Once coach sets level, it replaces self-assessment. | |
| Coach only visible to coach | Coach assessment is private — only visible to coaches. | |

**User's choice:** Both visible side-by-side
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Anytime from player profile | Coach visits player's profile and updates whenever they want. | ✓ |
| After session only | Coach prompted after each session ends. | |
| During progress notes | Skill level update bundled with writing a progress note. | |

**User's choice:** Anytime from player profile
**Notes:** None

---

## Lesson history display

| Option | Description | Selected |
|--------|-------------|----------|
| Chronological list | Reverse-chronological list of sessions attended. Date, time, venue, coach name. | ✓ |
| Calendar heatmap | GitHub-style heatmap showing frequency, plus list. | |
| Grouped by coach | Sessions grouped under each coach. | |

**User's choice:** Chronological list
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Simple counts | Total sessions, coaches worked with, member since date. | ✓ |
| Detailed analytics | Sessions per month chart, attendance rate, etc. | |
| No summary | Just the list. | |

**User's choice:** Simple counts
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Same view + notes column | Coaches see same list but with progress notes inline. | ✓ |
| Identical view | Same view for coaches and players. | |
| Coach gets dashboard view | Richer dashboard-style view for coaches. | |

**User's choice:** Same view + notes column
**Notes:** None

---

## Coach progress notes

| Option | Description | Selected |
|--------|-------------|----------|
| Free text | Simple text area. Coach writes whatever they want. | ✓ |
| Structured template | Predefined fields: strengths, areas to improve, drills, next steps. | |
| Free text + tags | Free text with optional skill tags. | |

**User's choice:** Free text
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| From session detail page | Coach adds notes per attendee from session view. Can also add from player profile. | ✓ |
| From player profile only | Coach navigates to player's profile to add note. | |
| Post-session prompt | App prompts coach to write notes after session ends. | |

**User's choice:** From session detail page
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| On profile in lesson history | Notes inline with session entry in lesson history. | ✓ |
| Separate notes tab | Dedicated 'Coach Notes' tab on profile. | |
| Notification + profile | Notification when coach adds note, plus on profile. | |

**User's choice:** On profile in lesson history
**Notes:** None

---

## Claude's Discretion

- Setup wizard step count and exact flow/transitions
- Avatar cropper implementation details
- Profile page layout and section ordering
- Lesson history pagination/infinite scroll approach
- Empty state designs for new players with no sessions
- Progress note character limits
- Form validation timing

## Deferred Ideas

None — discussion stayed within phase scope.
