interface Entry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Entry>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const next: Entry = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, next);

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: next.resetAt,
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}
