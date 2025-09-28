// Lightweight JWT payload decoder (no external deps)
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    return null;
  }
}

// Extract permissions object from token payload
export function extractPerms(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.perms || {};
}

// Check if user has view (GET) permission for a given domain key
export function hasViewPermission(perms, key) {
  if (!key) return true; // no key required
  const val = perms?.[key];
  if (typeof val !== 'number') return false;
  // bit 0 (0x1) corresponds to GET
  return (val & 0x1) === 0x1;
}

// Utility: given a list of candidate keys, return first allowed one or null
export function firstAllowed(perms, keys) {
  for (const k of keys) {
    if (hasViewPermission(perms, k)) return k;
  }
  return null;
}
