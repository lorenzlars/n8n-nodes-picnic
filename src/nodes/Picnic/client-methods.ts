export async function callClientMethod<T>(
  client: Record<string, unknown>,
  operationLabel: string,
  methodNames: string[],
  ...args: unknown[]
): Promise<T> {
  for (const methodName of methodNames) {
    const candidate = client[methodName];
    if (typeof candidate === 'function') {
      return (candidate as (...innerArgs: unknown[]) => Promise<T>).call(client, ...args);
    }
  }

  const availableMethods = Array.from(
    new Set([
      ...Object.keys(client),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(client) ?? {}),
    ]),
  ).filter((key) => key !== 'constructor' && typeof client[key] === 'function');

  throw new Error(
    `Unsupported picnic-api client for "${operationLabel}". Tried methods: ${methodNames.join(
      ', ',
    )}. Available methods: ${availableMethods.join(', ') || '(none)'}.`,
  );
}
