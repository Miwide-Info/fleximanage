// Fetch public meta (serviceTypes, permission preset keys) with simple caching.
let _cache = null;
let _ts = 0;
const TTL = 30 * 1000; // 30s

export async function fetchMeta(force = false) {
  const now = Date.now();
  if (!force && _cache && (now - _ts) < TTL) return _cache;
  const resp = await fetch('/api/public/meta');
  if (!resp.ok) throw new Error('meta http ' + resp.status);
  const data = await resp.json();
  _cache = data;
  _ts = now;
  return data;
}
