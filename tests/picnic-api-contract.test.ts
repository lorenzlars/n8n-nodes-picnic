import { describe, expect, it } from 'vitest';

describe('picnic-api contract', () => {
  it('exposes the methods used by the n8n node (v3 primary names)', async () => {
    const mod = await import('picnic-api');
    const PicnicApiCtor = (mod as { default?: new (...args: unknown[]) => unknown }).default
      ?? (mod as unknown as new (...args: unknown[]) => unknown);

    const methodNames = Object.getOwnPropertyNames(PicnicApiCtor.prototype);

    expect(methodNames).toContain('login');
    expect(methodNames).toContain('search');
    expect(methodNames).toContain('getShoppingCart');
    expect(methodNames).toContain('addProductToShoppingCart');
    expect(methodNames).toContain('clearShoppingCart');
    expect(methodNames).toContain('getDeliveries');
    expect(methodNames).toContain('getUserDetails');
  });
});
