import { describe, expect, it } from 'vitest';

describe('picnic-api contract', () => {
  it('exposes the domain services used by the n8n node (v4)', async () => {
    const mod = await import('picnic-api');
    const PicnicClientCtor = (mod as { default?: new (...args: unknown[]) => unknown }).default
      ?? (mod as unknown as new (...args: unknown[]) => unknown);

    const client = new PicnicClientCtor() as Record<string, unknown>;

    expect(client.auth).toBeDefined();
    expect(typeof (client.auth as Record<string, unknown>).login).toBe('function');

    expect(client.catalog).toBeDefined();
    expect(typeof (client.catalog as Record<string, unknown>).search).toBe('function');

    expect(client.cart).toBeDefined();
    expect(typeof (client.cart as Record<string, unknown>).getCart).toBe('function');
    expect(typeof (client.cart as Record<string, unknown>).addProductToCart).toBe('function');
    expect(typeof (client.cart as Record<string, unknown>).clearCart).toBe('function');

    expect(client.delivery).toBeDefined();
    expect(typeof (client.delivery as Record<string, unknown>).getDeliveries).toBe('function');

    expect(client.user).toBeDefined();
    expect(typeof (client.user as Record<string, unknown>).getUserDetails).toBe('function');
  });
});
