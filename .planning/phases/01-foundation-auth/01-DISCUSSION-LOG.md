# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 01-Foundation & Auth
**Areas discussed:** Auth flow UX, Role assignment & invites, Post-login routing, Protected page behavior

---

## Auth flow UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single page with tabs | One /auth page with Login/Sign Up tabs | ✓ |
| Separate pages | Dedicated /login and /signup pages with links between them | |
| Modal overlay | Auth forms appear as a modal over the landing page | |

**User's choice:** Single page with tabs
**Notes:** Recommended option accepted — minimal navigation, common SaaS pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password only | Minimal friction — collect name/details later in profile setup | ✓ |
| Email + password + full name | Capture name upfront so profiles aren't blank | |
| Email + password + name + role | User self-selects role during sign-up | |

**User's choice:** Email + password only
**Notes:** Gets users in fast. Profile details collected post-signup.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below fields | Red text beneath the specific field with the error | ✓ |
| Toast notification | Dismissible toast at the top of the page | |
| Banner above form | Summary error banner above the form | |

**User's choice:** Inline below fields
**Notes:** Standard, accessible pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, verify first | Confirmation email required before app access | ✓ |
| No, immediate access | User can use the app right away | |
| Soft verification | Access with banner prompting verification | |

**User's choice:** Yes, verify first
**Notes:** Prevents fake accounts.

---

## Role assignment & invites

| Option | Description | Selected |
|--------|-------------|----------|
| Invite link | Admin generates a coach invite link | ✓ |
| Email invite | Admin enters coach email, system sends invite | |
| Promote existing user | Coach signs up first, admin upgrades role | |

**User's choice:** Invite link
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Shareable invite link | Coach generates a reusable link for clients | ✓ |
| One-time invite per client | Coach enters client email for unique invite | |
| Invite code | Coach gets a short code clients enter at sign-up | |

**User's choice:** Shareable invite link — with major clarification
**Notes:** User specified that anyone should be able to sign up without being assigned to a coach. The app should run like a community app. Coach invite links are optional relationship-builders, not gatekeepers. User also mentioned moderators/managers for community control (blacklist, ban, kick) — noted as deferred idea.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, open sign-up + optional coach link | Anyone signs up freely. Coach link optionally assigns them. | ✓ |
| Open sign-up, but must join a community | Anyone can sign up but needs a community code | |

**User's choice:** Yes, open sign-up + optional coach link
**Notes:** Confirmed the open-community model.

| Option | Description | Selected |
|--------|-------------|----------|
| No expiry | Links stay valid until manually revoked | ✓ |
| 7-day expiry | Links expire after a week | |
| Configurable expiry | Coach/admin can set expiry per link | |

**User's choice:** No expiry
**Notes:** Matches Jaden's WhatsApp workflow — share link once, use indefinitely.

---

## Post-login routing

| Option | Description | Selected |
|--------|-------------|----------|
| Role-based home | Admin → dashboard, Coach → schedule, Client → sessions | ✓ |
| Shared home page | Everyone lands on same page with role-specific sections | |
| Single dashboard with role tabs | One dashboard that adapts by role | |

**User's choice:** Role-based home
**Notes:** Each role gets a tailored landing page.

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome + profile setup | Welcome page prompting profile completion | ✓ |
| Empty dashboard shell | Dashboard layout with placeholder content | |
| Community landing | Community name, member count, coming soon overview | |

**User's choice:** Welcome + profile setup
**Notes:** Practical for Phase 1 since session pages don't exist yet.

---

## Protected page behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /auth | Silently redirect, return after login | ✓ |
| Show access denied page | "Please log in" page with auth link | |
| Redirect to landing page | Send to public marketing page | |

**User's choice:** Redirect to /auth
**Notes:** With return-to-original-page after successful login.

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to their home | Silently redirect to role-appropriate page | ✓ |
| Show 403 forbidden page | Display access denied explanation | |
| Hide unauthorized nav items only | Hide links, show 403 on manual nav | |

**User's choice:** Redirect to their home
**Notes:** No error shown — users just land where they belong. Nav also hides unauthorized links.

---

## Claude's Discretion

- Loading spinner/skeleton design during auth state checks
- Exact form validation timing (on blur vs on submit)
- Password strength requirements
- Session refresh strategy edge cases

## Deferred Ideas

- Moderator/manager roles for community control (blacklist, ban, kick) — user mentioned during invite discussion
- OAuth / magic link login — explicitly out of scope per PROJECT.md
- Email notifications — in-app only for MVP
