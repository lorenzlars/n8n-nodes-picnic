import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildAuthCacheKey, clearCachedAuthKey, getCachedAuthKey, setCachedAuthKey } from './auth-cache';
import { callClientMethod } from './client-methods';
import { ensurePicnicAuthenticated } from './login';

type PicnicClient = {
  authKey?: string | null;
  login(userId: string, password: string): Promise<unknown>;
};

function getClientAuthKey(client: PicnicClient): string | undefined {
  const authKey = client.authKey;
  if (typeof authKey !== 'string') return undefined;
  const trimmed = authKey.trim();
  return trimmed ? trimmed : undefined;
}

function isLikelyAuthError(error: unknown): boolean {
  const message = (error as Error).message?.toLowerCase?.() ?? '';
  return (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('auth')
  );
}

async function executeOperation(
  client: Record<string, unknown>,
  operation: string,
  getNodeParameter: (name: string) => string | number,
): Promise<IDataObject> {
  if (operation === 'searchProducts') {
    const query = getNodeParameter('query') as string;
    return (await callClientMethod<IDataObject>(client, 'searchProducts', ['search'], query)) as IDataObject;
  }

  if (operation === 'getCart') {
    return (await callClientMethod<IDataObject>(client, 'getCart', [
      'getShoppingCart',
      'getCart',
    ])) as IDataObject;
  }

  if (operation === 'addToCart') {
    const productId = getNodeParameter('productId') as string;
    const count = getNodeParameter('count') as number;
    return (await callClientMethod<IDataObject>(
      client,
      'addToCart',
      ['addProductToShoppingCart'],
      productId,
      count,
    )) as IDataObject;
  }

  if (operation === 'clearCart') {
    return (await callClientMethod<IDataObject>(client, 'clearCart', [
      'clearShoppingCart',
      'clearCart',
    ])) as IDataObject;
  }

  if (operation === 'getDeliveries') {
    return (await callClientMethod<IDataObject>(client, 'getDeliveries', ['getDeliveries'])) as IDataObject;
  }

  if (operation === 'getUserDetails') {
    return (await callClientMethod<IDataObject>(client, 'getUserDetails', ['getUserDetails'])) as IDataObject;
  }

  throw new Error(`Unsupported operation: ${operation}`);
}

export class Picnic implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Picnic',
    name: 'picnic',
    icon: 'file:picnic.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Wrapper around the picnic-api npm package',
    usableAsTool: true,
    defaults: {
      name: 'Picnic',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'picnicApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Search Products', value: 'searchProducts', action: 'Search products' },
          { name: 'Get Cart', value: 'getCart', action: 'Get cart' },
          { name: 'Add Product To Cart', value: 'addToCart', action: 'Add product to cart' },
          { name: 'Clear Cart', value: 'clearCart', action: 'Clear cart' },
          { name: 'Get Deliveries', value: 'getDeliveries', action: 'Get deliveries' },
          { name: 'Get User Details', value: 'getUserDetails', action: 'Get user details' },
        ],
        default: 'searchProducts',
      },
      {
        displayName: 'Search Query',
        name: 'query',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            operation: ['searchProducts'],
          },
        },
      },
      {
        displayName: 'Product ID',
        name: 'productId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            operation: ['addToCart'],
          },
        },
      },
      {
        displayName: 'Count',
        name: 'count',
        type: 'number',
        default: 1,
        typeOptions: {
          minValue: 1,
        },
        displayOptions: {
          show: {
            operation: ['addToCart'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = this.getNodeParameter('operation', itemIndex) as string;

        const credentials = await this.getCredentials('picnicApi', itemIndex);
        const userId = ((credentials.userId as string) || '').trim();
        const password = (credentials.password as string) || '';
        const countryCode = (credentials.countryCode as string) || 'NL';
        const apiVersion = (credentials.apiVersion as string) || '15';
        const configuredAuthKey = ((credentials.authKey as string) || '').trim();
        const hasConfiguredAuthKey = configuredAuthKey.length > 0;
        const cacheKey = hasConfiguredAuthKey
          ? undefined
          : buildAuthCacheKey(userId, countryCode, apiVersion);
        const cachedAuthKey = cacheKey ? getCachedAuthKey(cacheKey) : undefined;
        const initialAuthKey = configuredAuthKey || cachedAuthKey;

        const imported = await import('picnic-api');
        const PicnicAPI = (imported.default ?? imported) as unknown as new (options: {
          countryCode: string;
          apiVersion: string;
          authKey?: string;
        }) => PicnicClient;

        const client = new PicnicAPI({
          countryCode,
          apiVersion,
          authKey: initialAuthKey || undefined,
        });

        try {
          await ensurePicnicAuthenticated(client, initialAuthKey || '', userId, password);

          if (!hasConfiguredAuthKey && cacheKey) {
            const newAuthKey = getClientAuthKey(client);
            if (newAuthKey) {
              setCachedAuthKey(cacheKey, newAuthKey);
            }
          }
        } catch (error) {
          throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex });
        }

        let responseData: IDataObject;

        try {
          responseData = await executeOperation(client as unknown as Record<string, unknown>, operation, (name) =>
            this.getNodeParameter(name, itemIndex) as string | number,
          );
        } catch (error) {
          // Retry once if cached auth key has expired.
          if (!hasConfiguredAuthKey && cacheKey && isLikelyAuthError(error) && userId && password) {
            clearCachedAuthKey(cacheKey);

            const retryClient = new PicnicAPI({
              countryCode,
              apiVersion,
            });

            await ensurePicnicAuthenticated(retryClient, '', userId, password);

            const refreshedAuthKey = getClientAuthKey(retryClient);
            if (refreshedAuthKey) {
              setCachedAuthKey(cacheKey, refreshedAuthKey);
            }

            responseData = await executeOperation(
              retryClient as unknown as Record<string, unknown>,
              operation,
              (name) => this.getNodeParameter(name, itemIndex) as string | number,
            );
          } else {
            throw error;
          }
        }

        returnData.push({
          json: {
            operation,
            result: responseData,
          },
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
