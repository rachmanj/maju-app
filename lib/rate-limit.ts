const store = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 120;

function getKey(identifier: string): string {
  return identifier;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) store.delete(key);
  }
}

export function rateLimit(identifier: string): { success: boolean; remaining: number } {
  const now = Date.now();
  if (store.size > 10000) cleanup();
  const key = getKey(identifier);
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return { success: false, remaining: 0 };
  }
  return { success: true, remaining: MAX_REQUESTS - entry.count };
}
