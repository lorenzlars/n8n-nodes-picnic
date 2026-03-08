import { describe, expect, it } from 'vitest';
import PicnicClient from 'picnic-api';
import type { CountryCode } from 'picnic-api/lib/types/common';

describe('picnic add to cart (live)', () => {
  const user = process.env.PICNIC_USER as string;
  const password = process.env.PICNIC_PASSWORD as string;

  it.skipIf(!user || !password)('adds a product to cart via search', async () => {
    const client = new PicnicClient({
      countryCode: 'DE',
      apiVersion: '15',
    });

    await client.auth.login(user, password);

    // Search for a common product to get a valid product ID
    const searchResults = await client.catalog.search('Milch') as Record<string, unknown>[];
    expect(searchResults.length).toBeGreaterThan(0);

    // Extract the first product ID from the search results
    const firstResult = searchResults[0] as Record<string, unknown>;
    const items = (firstResult.items ?? []) as Record<string, unknown>[];
    expect(items.length).toBeGreaterThan(0);

    const productId = items[0].id as string;
    expect(productId).toBeDefined();

    // Add the product to the cart
    const addResult = await client.cart.addProductToCart(productId, 1);
    expect(addResult).toBeDefined();

    // Verify the cart is not empty
    const cart = await client.cart.getCart() as Record<string, unknown>;
    expect(cart).toBeDefined();
  });
});
