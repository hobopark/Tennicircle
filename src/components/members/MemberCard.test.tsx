import { describe, it } from 'vitest'

describe('MemberCard', () => {
  it.todo('renders display name and role badge (MGMT-05)')
  it.todo('renders "Profile pending" badge when hasProfile is false (MGMT-07)')
  it.todo('renders dimmed card (opacity-60) when hasProfile is false (MGMT-07)')
  it.todo('renders assigned coach names for client members (D-06)')
  it.todo('renders last session date when available (D-06)')
  it.todo('shows expand button for coach viewer on non-self cards')
  it.todo('shows "Assign to me" button for unassigned clients when viewer is coach (D-09)')
  it.todo('shows "Remove from my clients" button for assigned clients when viewer is coach (D-09)')
  it.todo('shows admin role actions (Promote, Grant Admin, Remove) when viewer is admin (D-07)')
  it.todo('hides all actions on self card')
})

describe('RosterToggle', () => {
  it.todo('renders My clients and All members options (MGMT-05)')
  it.todo('highlights selected option')
  it.todo('calls onChange with correct value on click')
})
