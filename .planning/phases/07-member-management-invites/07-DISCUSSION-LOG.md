# Phase 7: Member Management & Invite System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 07-member-management-invites
**Areas discussed:** Invite link UI & sharing, Member roster & filtering, Admin role management, Coach client assignment

---

## Invite link UI & sharing

| Option | Description | Selected |
|--------|-------------|----------|
| On the member roster page | "Invite" button at the top of the roster — admin sees role selector, coach sees client-only invite | ✓ |
| Dedicated admin settings page | Separate /admin/invites page with invite history, active links, and revocation | |
| Both — quick + full management | Quick-generate on roster plus full invite management page for admins | |

**User's choice:** On the member roster page
**Notes:** Keeps member management in one place

| Option | Description | Selected |
|--------|-------------|----------|
| Copy link button only | Simple clipboard copy with toast confirmation | ✓ |
| Copy link + QR code | Copy button plus generated QR code for in-person sharing | |
| Copy link + native share sheet | Copy button plus Web Share API for mobile | |

**User's choice:** Copy link button only
**Notes:** Matches Jaden's WhatsApp workflow — generate, copy, paste

---

## Member roster & filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Single roster page, role-adaptive | One /coach/clients page reworked: coaches see toggle, admins see role controls | ✓ |
| Separate pages per role | Coach keeps /coach/clients, admin gets /admin/members | |
| Unified /members route | New top-level /members page replacing /coach/clients | |

**User's choice:** Single roster page, role-adaptive
**Notes:** Reuses existing page

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed card + "Profile pending" badge | Member appears with greyed avatar, display_name fallback, subtle badge | ✓ |
| Separate "Pending" section at bottom | Roster splits into active and pending sections | |
| Inline with nudge action | Normal list order with "Send reminder" button | |

**User's choice:** Dimmed card + "Profile pending" badge
**Notes:** Remove the .filter(p => p.hasProfile) exclusion

| Option | Description | Selected |
|--------|-------------|----------|
| Name, role badge, coach name, last active | Display name, role chip, assigned coach, last session date | ✓ |
| Name, role badge, skill level, attendance | Stats-focused with skill and session count | |
| Minimal — name and role only | Clean, details on tap | |

**User's choice:** Name, role badge, coach name, last active
**Notes:** Consistent with existing client card pattern

---

## Admin role management

| Option | Description | Selected |
|--------|-------------|----------|
| Inline actions on roster cards | Tap member card for role options: Promote to Coach, Grant Admin, Remove | ✓ |
| Member detail page with role section | Profile page with "Role & Permissions" section | |
| Swipe/long-press actions | Gesture-based role actions on cards | |

**User's choice:** Inline actions on roster cards
**Notes:** Uses existing updateMemberRole action

| Option | Description | Selected |
|--------|-------------|----------|
| Styled Dialog confirmation | Dialog with member name and warning, Roland Garros orange confirm button | ✓ |
| Two-step: Remove → Undo toast | Immediate remove with undo toast for 5 seconds | |

**User's choice:** Styled Dialog confirmation
**Notes:** Per established preference — no browser dialogs, no red for destructive actions

---

## Coach client assignment

| Option | Description | Selected |
|--------|-------------|----------|
| "Assign to me" button on member card | One tap to claim unassigned members, reverse to remove | ✓ |
| Batch assignment from picker | Multi-select picker for bulk assignment | |
| Drag between lists | Visual drag-and-drop between columns | |

**User's choice:** "Assign to me" button on member card
**Notes:** Simple and direct

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — multiple coaches per client | Client on multiple coach lists, needs junction table | ✓ |
| No — one coach per client | Assigning to new coach removes from previous | |

**User's choice:** Yes — multiple coaches per client
**Notes:** Requires schema migration from coach_id FK to junction table (coach_client_assignments)

---

## Claude's Discretion

- Search/filter within roster
- Exact layout of inline role management actions
- Empty state for roster
- Invite link display format
- Loading states and skeletons
- Toggle styling for "My clients" / "All members"
- Admin self-demotion prevention

## Deferred Ideas

- QR code for invite links — future enhancement
- Native share sheet — nice-to-have for mobile
- Batch member assignment — could be its own feature
- Invite link expiry — current decision is no expiry
- Member directory visible to all members — v2 feature
