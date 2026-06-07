// Tiny in-memory TTL cache so repeated searches for the same route don't burn
// through third-party API rate limits. Process-local (resets on restart) — fine
// for a single Node server; swap for Redis if you scale horizontally.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs = 10 * 60 * 1000): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** Memoize an async function for `ttlMs`, keyed by `key`. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}
