---
status: complete
phase: 02-session-management
source: [02-00-SUMMARY.md, 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-04-07T17:10:00Z
updated: 2026-04-07T17:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill dev server, delete .next, run `npm run dev`. Server boots without errors. Navigate to localhost:3000 — loads and redirects to /auth.
result: pass

### 2. Coach Login Redirect
expected: Log in as coach@test.com. Should redirect directly to /coach (not /welcome).
result: pass

### 3. Coach Calendar Empty State
expected: On /coach with no sessions, calendar shows "Your schedule is clear" message with "Create session" button. Week navigation arrows and date picker are visible above the grid.
result: pass

### 4. Create Recurring Session
expected: Click "Create session". Form shows: title, day, time, duration, venue, court number, capacity, start/end dates, client picker, co-coaches. Fill in all fields and submit. Redirects to /coach with sessions appearing on the calendar.
result: pass

### 5. Session Calendar Display
expected: Calendar blocks show: session title, time, venue, and court number (if assigned). Clicking a session navigates to the session detail page.
result: pass

### 6. Session Detail Page (Coach)
expected: Shows session title as heading, date, time, venue, court number. Inline court number editor. Edit and Cancel buttons. Confirmed attendees list. Waitlist panel.
result: pass

### 7. Edit Session — This Only
expected: Click Edit. Scope dialog appears. Select "This session only". Edit form shows all fields. Change venue, save. Only that session updates.
result: pass

### 8. Edit Session — Title Change
expected: Edit a session and change the title. After save, all sessions from that template show the new title on the calendar.
result: issue
reported: "when i edit the title for just this session only, it deleted all future sessions after i save the change"
severity: blocker

### 9. Cancel Session
expected: Click "Cancel session". Dialog requires a reason. Enter reason, submit. Session shows "Cancelled: {reason}" banner. Calendar block shows line-through/muted styling.
result: issue
reported: "cancelling session first created a completely random session for a week after, at 7pm, but its labelled 1:46am in the box and cancelled this instead. it worked the second time"
severity: major

### 10. Client Login Redirect
expected: Log out. Log in as client@test.com. Should redirect directly to /sessions (not /welcome).
result: pass

### 11. Client Calendar — Invited Sessions Only
expected: Client sees calendar with only sessions they were invited to.
result: pass

### 12. Client Session Detail
expected: Click a session. Detail page shows title, date, time, venue, court number, duration. Shows "You're confirmed" with "Can't make it" button.
result: pass

### 13. Client Cancel RSVP
expected: Click "Can't make it". RSVP cancelled. Status changes to "You are not currently attending this session."
result: issue
reported: "when i click the button, it goes to 'cancelling..' and comes back to 'cant make it' and nothing updates"
severity: major

### 14. Week Navigation
expected: Calendar arrows move forward/backward one week. "Today" returns to current week. Month/year text opens date picker to jump to any week.
result: pass

### 15. Court Number Persistence
expected: Coach creates session with court number "3". All generated sessions show "Court No.3" on calendar and detail page.
result: pass

## Summary

total: 15
passed: 12
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Editing title with 'this only' scope should only update that session's template title, not delete future sessions"
  status: failed
  reason: "User reported: when i edit the title for just this session only, it deleted all future sessions after i save the change"
  severity: blocker
  test: 8
  root_cause: "editSession 'this' scope sends all form fields (including unchanged ones) as an update. The scheduled_at conversion with +00:00 UTC offset likely creates a conflict with the unique constraint (template_id, scheduled_at), or the empty updates object causes unexpected behavior"
  artifacts:
    - path: "src/lib/actions/sessions.ts"
      issue: "editSession 'this' scope path processes all form fields even when only title changed"
  missing:
    - "Guard against empty session updates when only title changed"
    - "Fix scheduled_at timezone handling in edit path"

- truth: "Cancel session should only cancel the target session without creating phantom sessions"
  status: failed
  reason: "User reported: cancelling session first created a completely random session for a week after, at 7pm, but its labelled 1:46am in the box and cancelled this instead"
  severity: major
  test: 9
  root_cause: "Timezone mismatch between session generation (Australia/Sydney) and display (UTC vs local). The phantom session likely comes from generate_sessions_from_templates being triggered or a stale revalidation cache showing wrong data"
  artifacts:
    - path: "src/lib/actions/sessions.ts"
      issue: "cancelSession or revalidation may trigger session regeneration"
    - path: "src/components/calendar/WeekCalendarGrid.tsx"
      issue: "Time display shows UTC (1:46am) instead of local (7pm)"
  missing:
    - "Investigate if cancelSession triggers session generation"
    - "Fix time display to use consistent local timezone"

- truth: "Client can cancel their own RSVP via 'Can't make it' button"
  status: failed
  reason: "User reported: when i click the button, it goes to 'cancelling..' and comes back to 'cant make it' and nothing updates"
  severity: major
  test: 13
  root_cause: "RLS policy session_rsvps_update only allows coach/admin roles. Client cannot UPDATE their own RSVP to set cancelled_at."
  artifacts:
    - path: "supabase/migrations/00002_session_schema.sql"
      issue: "session_rsvps UPDATE policy excludes client role"
  missing:
    - "Add RLS policy allowing clients to update their own RSVP (member_id match)"
