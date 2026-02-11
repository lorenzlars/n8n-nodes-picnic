const DEFAULT_AUTH_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CacheEntry = {
  authKey: string;
  expiresAt: number;
};

const authCache = new Map<string, CacheEntry>();

function getCacheTtlMs(): number {
  const rawValue = process.env.PICNIC_AUTH_CACHE_TTL_MS;
  if (!rawValue) return DEFAULT_AUTH_CACHE_TTL_MS;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_AUTH_CACHE_TTL_MS;

  return parsed;
}

export function buildAuthCacheKey(userId: string, countryCode: string, apiVersion: string): string {
  return `${userId.toLowerCase()}|${countryCode.toUpperCase()}|${apiVersion}`;
}

export function getCachedAuthKey(cacheKey: string): string | undefined {
  const entry = authCache.get(cacheKey);
  if (!entry) return undefined;

  if (Date.now() >= entry.expiresAt) {
    authCache.delete(cacheKey);
    return undefined;
  }

  return entry.authKey;
}

export function setCachedAuthKey(cacheKey: string, authKey: string): void {
  authCache.set(cacheKey, {
    authKey,
    expiresAt: Date.now() + getCacheTtlMs(),
  });
}

export function clearCachedAuthKey(cacheKey: string): void {
  authCache.delete(cacheKey);
}
