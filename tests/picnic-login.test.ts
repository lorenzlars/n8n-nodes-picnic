import { describe, expect, it, vi } from 'vitest';
import { ensurePicnicAuthenticated } from '../src/nodes/Picnic/login';

describe('ensurePicnicAuthenticated', () => {
  it('calls login with email and password when authKey is empty', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const client = { login };

    await ensurePicnicAuthenticated(client, '', 'john@example.com', 'topsecret');

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith('john@example.com', 'topsecret');
  });

  it('does not call login when authKey is present', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const client = { login };

    await ensurePicnicAuthenticated(client, 'auth-key-value', '', '');

    expect(login).not.toHaveBeenCalled();
  });

  it('throws when no authKey and missing credentials', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const client = { login };

    await expect(ensurePicnicAuthenticated(client, '', '', '')).rejects.toThrow(
      'Provide either authKey or email + password.',
    );
    expect(login).not.toHaveBeenCalled();
  });
});
