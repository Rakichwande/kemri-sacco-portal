// Single source of truth for role values/labels/assignment rules on the
// frontend. Values must match ROLES in the backend's
// middleware/permissions.js exactly - note Super Administrator is stored
// as 'admin', not 'super_admin' (kept for backward compatibility with
// existing accounts).
//
// The ROLES array lists every role that exists in the system. It's used
// for display purposes (rendering an existing staff member's role label,
// looking up a role's label from a value). Do NOT remove entries from
// this array — a staff member with a role that isn't listed here would
// render their raw role value instead of a friendly label.
//
// Which roles can be ASSIGNED (via the invite modal or the role-change
// dropdown) is controlled separately by ASSIGNABLE_ROLES below.
export const ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Super Administrator' },
  { value: 'sacco_admin', label: 'SACCO Administrator' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'loans_officer', label: 'Loans Officer' },
  { value: 'member_support', label: 'Member Support' },
  { value: 'auditor', label: 'Auditor' },
];

export const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

// Mirrors ASSIGNABLE_ROLES in middleware/permissions.js — who can grant
// which roles to other accounts. UI convenience only; the server still
// enforces canAssignRole() on every request regardless of this.
//
// KEMRI SACCO operates with four roles in practice. Three entries in the
// ROLES array above are deliberately NOT assignable:
//
//   - member_support: its permissions are a subset of sacco_admin's.
//     A distinct support role adds complexity without adding safety
//     at this scale — if you need someone to edit member records,
//     make them a SACCO Administrator.
//   - auditor: read-only access, useful only if an external auditor
//     needs direct console access rather than shared reports. Unhide
//     by adding 'auditor' below if that changes.
//   - staff: legacy role kept for backward compatibility; superseded
//     by the six specific roles above. Should never be assigned.
//
// To re-enable any hidden role, add its value to the arrays below.
// The ROLES entries themselves remain intact — existing accounts with
// those roles still render their correct labels.
export const ASSIGNABLE_ROLES = {
  admin: ['admin', 'sacco_admin', 'finance_officer', 'loans_officer'],
  sacco_admin: ['finance_officer', 'loans_officer'],
};

export function assignableRolesFor(assignerRole) {
  const allowedValues = ASSIGNABLE_ROLES[assignerRole] || [];
  return ROLES.filter((r) => allowedValues.includes(r.value));
}