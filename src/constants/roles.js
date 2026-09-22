// Single source of truth for role values/labels/assignment rules on the
// frontend. Values must match ROLES in the backend's
// middleware/permissions.js exactly - note Super Administrator is stored
// as 'admin', not 'super_admin' (kept for backward compatibility with
// existing accounts).
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

// Mirrors ASSIGNABLE_ROLES in middleware/permissions.js - who can grant
// which roles to other accounts. UI convenience only; the server still
// enforces canAssignRole() on every request regardless of this.
export const ASSIGNABLE_ROLES = {
  admin: ['admin', 'sacco_admin', 'finance_officer', 'loans_officer', 'member_support', 'auditor', 'staff'],
  sacco_admin: ['finance_officer', 'loans_officer', 'member_support', 'auditor'],
};

export function assignableRolesFor(assignerRole) {
  const allowedValues = ASSIGNABLE_ROLES[assignerRole] || [];
  return ROLES.filter((r) => allowedValues.includes(r.value));
}