// System constants
// Since foreign key constraints are removed and user_id is nullable,
// we return null for user_id fields
export const SYSTEM_USER_ID = null;

// Get user ID - in no-auth mode, returns null
export function getCurrentUserId(): string | null {
  // Since auth is disabled and foreign keys are removed, return null
  return SYSTEM_USER_ID;
}
