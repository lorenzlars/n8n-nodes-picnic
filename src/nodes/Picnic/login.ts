export interface PicnicLoginClient {
  login(userId: string, password: string): Promise<unknown>;
}

export async function ensurePicnicAuthenticated(
  client: PicnicLoginClient,
  authKey: string,
  userId: string,
  password: string,
): Promise<void> {
  if (authKey) {
    return;
  }

  if (!userId || !password) {
    throw new Error('Provide either authKey or email + password.');
  }

  await client.login(userId, password);
}
