---
phase: 05-notifications
evaluation_round: 1
result: PASS WITH NOTES
weighted_average: 7.3
timestamp: 2026-04-08
scores:
  functionality: 8
  product_depth: 7
  ux_design: 7
  code_quality: 7
---

# Phase 05 Evaluation: Notifications

## Scores

| Criterion | Weight | Score | Justification |
|-----------|--------|-------|---------------|
| Functionality | 30% | 8 | All 8 notification types wired end-to-end. Schema, triggers, feed, badge, cron all functional. |
| Product Depth | 25% | 7 | Loading states, empty states, realtime, optimistic UI all present. Minor gaps in idempotency and avatar. |
| UX & Design | 25% | 7 | Consistent with UI-SPEC. Deep links role-aware. Badge color intentionally deviated to tennis ball yellow. One spec deviation noted. |
| Code Quality | 20% | 7 | Fire-and-forget pattern consistent. Service client isolated. Some duplication in name resolution. |

**Weighted Average: 0.30(8) + 0.25(7) + 0.25(7) + 0.20(7) = 2.4 + 1.75 + 1.75 + 1.4 = 7.3**

**Result: PASS WITH NOTES**

---

## Detailed Findings

### 1. Notifications Schema (Score contribution: Strong)

**RLS: Correct.** Three policies covering SELECT (member-scoped), UPDATE (member-scoped with `with check`), and INSERT (service_role only). The INSERT policy uses `to service_role` which correctly restricts inserts to the service role key only -- no authenticated user can insert notifications.
- File: `supabase/migrations/00006_notifications_schema.sql`, lines 52-77

**Indexes: Present and well-designed.**
- `notifications_session_reminder_unique` -- partial unique index for cron idempotency (line 33-35)
- `idx_notifications_member_created` -- feed query performance (line 38-39)
- `idx_notifications_unread` -- partial index for unread count queries (line 44-45)
- `idx_notifications_community` -- community-scoped queries (line 41-42)

**Check constraint: Covers all 8 types** including the extended types (event_updated, session_updated, session_cancelled, rsvp_cancelled) -- line 12-13.

**Realtime publication: Enabled** -- line 82.

### 2. Notification Triggers (Score contribution: Strong)

All 8 notification types are wired with fire-and-forget `.then(() => {})` pattern:

| Type | File | Lines | Verified |
|------|------|-------|----------|
| session_reminder | `src/app/api/cron/session-reminders/route.ts` | 41-46 | YES |
| announcement | `src/lib/actions/announcements.ts` | 65-73 | YES |
| rsvp_confirmed (session) | `src/lib/actions/rsvps.ts` | 146-153 | YES |
| rsvp_confirmed (event) | `src/lib/actions/events.ts` | 198-205 | YES |
| waitlist_promoted (session) | `src/lib/actions/rsvps.ts` | 368-375 | YES |
| waitlist_promoted (event) | `src/lib/actions/events.ts` | 278-285 | YES |
| event_updated | `src/lib/actions/events.ts` | 413-421 | YES |
| session_updated | `src/lib/actions/sessions.ts` | 330-338 | YES |
| session_cancelled | `src/lib/actions/sessions.ts` | 402-410 | YES |
| rsvp_cancelled (session) | `src/lib/actions/rsvps.ts` | 271-279 | YES |
| rsvp_cancelled (event) | `src/lib/actions/events.ts` | 319-326 | YES |

**Bonus:** Coach notification on new RSVP (rsvps.ts lines 156-189) and RSVP cancellation notifications to coaches/event creators (rsvps.ts lines 237-281, events.ts lines 290-328) go beyond the original 8-type plan -- good product instinct.

### 3. Notification Feed (Score contribution: Solid)

**Realtime subscription: Present.** `postgres_changes` INSERT subscription filtered to `member_id=eq.${memberId}` in `NotificationFeed.tsx` line 82-94. New rows prepend and increment unread count.

**Mark read: Working.** Both `markNotificationRead` (single) and `markAllNotificationsRead` (bulk) are wired with optimistic UI updates before server action fire.
- `NotificationFeed.tsx` lines 100-124
- `src/lib/actions/notifications.ts` lines 8-63

**Deep links: Role-aware.** `resolveDeepLink` checks `userRole` to route sessions to `/coach/sessions/{id}` vs `/sessions/{id}`. All 8 types handled in switch statement.
- `NotificationFeed.tsx` lines 20-49

**NOTE:** Deep link for `session_reminder` routes coaches to `/coach/sessions/{id}` but the metadata only has `session_id`, not `resource_id`. The `sessionLink` function correctly reads `meta.session_id` for this case (line 33). Good.

### 4. Bell Badge (Score contribution: Solid)

**Unread count: Present.** Initial fetch via `count: 'exact', head: true` query in AppNav useEffect (line 98-104).

**Realtime updates: Present.** INSERT increments count; UPDATE re-fetches exact count to avoid drift (lines 111-150).

**Tennis ball yellow: Correct.** Badge uses inline style `backgroundColor: '#c8e030', color: '#1a1a1a'` (line 190). This is a deliberate deviation from the UI-SPEC which specified `bg-primary text-primary-foreground` (green). The tennis ball yellow is a better design choice for a notification badge -- it provides stronger visual contrast against the green active state.

**Cap at 9+: Correct.** Line 193: `unreadCount > 9 ? '9+' : unreadCount`.

**Hidden when 0: Correct.** Conditional render at line 187: `unreadCount > 0 &&`.

### 5. Cron Endpoint (Score contribution: Solid with one concern)

**CRON_SECRET auth: Correct.** Bearer token check on line 6-9. Returns 401 on mismatch.

**Sydney timezone: Correct.** `formatTime` helper uses `timeZone: 'Australia/Sydney'` (line 79-84).

**NOTE (Idempotency concern):** The cron uses plain `.insert()` and catches 23505 errors (lines 54-65). However, if the cron runs twice and ALL notifications are duplicates, the entire batch insert will fail with 23505 and `insertedCount` will still be set to `inserts.length` (line 66), misreporting the count. This is cosmetic (the response JSON is diagnostic only) but technically incorrect. More importantly, if a batch contains a mix of new and duplicate rows, the entire batch fails -- Supabase `.insert()` without `onConflict` is atomic, so zero rows get inserted even if only one is a duplicate. This means a second cron run within the same window where some new RSVPs appeared will fail to create reminders for those new RSVPs.

**Recommendation:** Use individual inserts per notification or use `.upsert()` with `ignoreDuplicates: true` if the Supabase JS client supports it, or insert rows one-by-one with error swallowing.

### 6. Middleware (Score contribution: Strong)

**/notifications in allowed routes: Correct.** All three role route maps include `/notifications`:
- `src/lib/supabase/middleware.ts` line 76-78: admin, coach, and client arrays all contain `/notifications`

**/api/cron bypasses auth: Correct.** `isApiCron` check at line 33 feeds into `isPublicPath` at line 34, which skips the redirect-to-auth guard at line 36.

### 7. Extended Types (Score contribution: Strong)

All extended types are fully handled across the stack:

| Type | DB check constraint | TS type | Row icon | Deep link |
|------|-------------------|---------|----------|-----------|
| event_updated | line 12 | line 6 | PenLine (NotificationRow.tsx:20) | events/{id} (Feed:43) |
| session_updated | line 12 | line 7 | PenLine (NotificationRow.tsx:20) | coach/sessions/{id} or sessions/{id} (Feed:45) |
| session_cancelled | line 12 | line 8 | XCircle orange (NotificationRow.tsx:22) | coach/sessions/{id} or sessions/{id} (Feed:45) |
| rsvp_cancelled | line 12 | line 9 | UserX (NotificationRow.tsx:24) | varies by resource_type (Feed:42-45) |

**Good detail:** `session_cancelled` uses `XCircle` with orange color (`text-orange-600 dark:text-orange-400`) to visually distinguish cancellation severity from normal updates.

### 8. Member Name Resolution (Score contribution: Good)

Uses `community_members.display_name` with `player_profiles` fallback and final `'A member'` fallback. Pattern consistent across:
- `rsvps.ts` lines 163-178 (RSVP notification)
- `rsvps.ts` lines 251-266 (cancel RSVP notification)
- `events.ts` lines 299-314 (cancel event RSVP notification)

This matches the Supabase schema gotcha documented in MEMORY.md about community_members not having avatar_url and needing player_profiles for names.

### 9. Timezone (Score contribution: Strong)

- `formatDateTime` in `src/lib/utils/dates.ts` uses `timeZone: 'Australia/Sydney'` throughout (lines 8-18). Correct.
- `formatTime` in cron route uses `timeZone: 'Australia/Sydney'` (line 80). Correct.
- `toSydneyIso` is used in events.ts for date+time combination (referenced at line 375 of events.ts).

---

## Issues and Recommendations

### P1 -- Cron batch idempotency flaw (Functionality)

**File:** `src/app/api/cron/session-reminders/route.ts`, lines 54-67

The batch `.insert(inserts)` is atomic. If any single row is a duplicate (23505), the ENTIRE batch fails and no new reminders are created. This means if the cron runs at 8:00 PM, then a new RSVP happens at 8:15 PM, and the cron runs again at 8:20 PM, the new RSVP will NOT get a reminder because the batch will fail on the existing duplicates.

**Fix:** Insert rows individually in a loop, or use `ignoreDuplicates` option on the Supabase insert if available, or partition the inserts to handle conflicts gracefully.

### P2 -- Badge color deviates from UI-SPEC (UX/Design)

**File:** `src/components/nav/AppNav.tsx`, line 190

UI-SPEC (line 157) specifies `bg-primary text-primary-foreground` for the badge. Implementation uses inline style `backgroundColor: '#c8e030'` (tennis ball yellow). This is arguably a better choice for badge visibility but is an undocumented deviation. If intentional, update the UI-SPEC.

### P3 -- Announcement notification lacks sender avatar (Product Depth)

**File:** `src/components/notifications/NotificationRow.tsx`

UI-SPEC line 139 states: "For announcement notifications, the posting coach/admin's InitialsAvatar is shown instead [of the type icon]." The implementation renders the `Megaphone` icon for all announcements regardless. The metadata only carries `announcement_id` -- no sender name or avatar info is stored.

### P4 -- Missing Realtime UPDATE subscription in NotificationFeed (Product Depth)

**File:** `src/components/notifications/NotificationFeed.tsx`, lines 82-94

The feed only subscribes to INSERT events. When another device/tab marks notifications as read, the feed won't reflect those changes. The AppNav correctly subscribes to both INSERT and UPDATE events (lines 117-147), but the feed component does not. This is minor since optimistic updates handle the common case, but cross-tab/cross-device sync won't work for the feed.

### P5 -- Duplicated name resolution logic (Code Quality)

The `community_members.display_name -> player_profiles.display_name -> 'A member'` pattern is duplicated three times across `rsvps.ts` and `events.ts`. Extract to a shared `resolveMemberName(supabase, memberId)` utility.

---

## Summary

The notification system is well-built with strong security (RLS, service_role isolation), complete type coverage (8 types across schema/types/icons/deep-links), and good UX patterns (optimistic updates, realtime subscriptions, role-aware deep links). The cron batch idempotency flaw (P1) is the most actionable issue -- it can silently fail to deliver reminders in edge cases. The remaining items are polish-level improvements.
