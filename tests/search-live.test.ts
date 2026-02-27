import { describe, it } from 'vitest';
import PicnicClient from 'picnic-api';
import { CountryCode } from 'picnic-api/lib/types/picnic-api';

describe('picnic search (live)', () => {
  const user = process.env.PICNIC_USER as string;
  const password = process.env.PICNIC_PASSWORD as string;
  const countryCode = process.env.PICNIC_COUNTRY_CODE as CountryCode || 'DE';

  it.skipIf(!user || !password)('search for "Milch"', async () => {
    const picnicClient = new PicnicClient({
      countryCode,
      apiVersion: "15",
    });

    await picnicClient.login(user, password);
    await picnicClient.search('Milch')
  });
});
