import { describe, it } from 'vitest';
import PicnicClient from 'picnic-api';
import type { CountryCode } from 'picnic-api/lib/types/common';

describe('picnic search (live)', () => {
  const user = process.env.PICNIC_USER as string;
  const password = process.env.PICNIC_PASSWORD as string;

  it.skipIf(!user || !password)('search for "Milch"', async () => {
    const picnicClient = new PicnicClient({
      countryCode: 'DE',
      apiVersion: '15',
    });

    await picnicClient.auth.login(user, password);
    await picnicClient.catalog.search('Milch');
  });
});
