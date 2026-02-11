import { describe, expect, it, vi } from 'vitest';
import { buildAuthCacheKey, getCachedAuthKey, setCachedAuthKey } from '../src/nodes/Picnic/auth-cache';

describe('auth cache', () => {
  it('builds a stable cache key', () => {
    const key = buildAuthCacheKey('User@Example.com', 'nl', '15');
    expect(key).toBe('user@example.com|NL|15');
  });

  it('stores and retrieves auth key', () => {
    const key = buildAuthCacheKey('john@example.com', 'NL', '15');
    setCachedAuthKey(key, 'token-123');
    expect(getCachedAuthKey(key)).toBe('token-123');
  });

  it('expires cached auth key based on ttl', async () => {
    vi.useFakeTimers();
    vi.stubEnv('PICNIC_AUTH_CACHE_TTL_MS', '10');

    const key = buildAuthCacheKey('jane@example.com', 'NL', '15');
    setCachedAuthKey(key, 'token-456');
    expect(getCachedAuthKey(key)).toBe('token-456');

    vi.advanceTimersByTime(11);
    expect(getCachedAuthKey(key)).toBeUndefined();

    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
});
