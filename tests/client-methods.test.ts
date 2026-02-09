import { describe, expect, it, vi } from 'vitest';
import { callClientMethod } from '../src/nodes/Picnic/client-methods';

describe('callClientMethod', () => {
  it('uses primary method when available', async () => {
    const getShoppingCart = vi.fn().mockResolvedValue({ ok: true });
    const client = { getShoppingCart };

    const result = await callClientMethod(client, 'getCart', ['getShoppingCart', 'getCart']);

    expect(getShoppingCart).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it('falls back to older method name', async () => {
    const getCart = vi.fn().mockResolvedValue({ legacy: true });
    const client = { getCart };

    const result = await callClientMethod(client, 'getCart', ['getShoppingCart', 'getCart']);

    expect(getCart).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ legacy: true });
  });

  it('throws a clear error when no candidate method exists', async () => {
    const client = { notRelevant: vi.fn() };

    await expect(
      callClientMethod(client, 'getCart', ['getShoppingCart', 'getCart']),
    ).rejects.toThrow('Unsupported picnic-api client for "getCart"');
  });
});
