import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildAuthCacheKey, clearCachedAuthKey, getCachedAuthKey, setCachedAuthKey } from './auth-cache';
import { ensurePicnicAuthenticated } from './login';

type PicnicClient = {
  authKey?: string | null;
  auth: { login(username: string, password: string): Promise<unknown> };
  catalog: {
    search(query: string): Promise<unknown>;
    getProductDetails(productId: string): Promise<unknown>;
  };
  cart: {
    getCart(): Promise<unknown>;
    addProductToCart(productId: string, count: number): Promise<unknown>;
    addProductsToCart(products: Array<{ productId: string; count: number }>): Promise<unknown>;
    removeProductFromCart(productId: string, count?: number): Promise<unknown>;
    clearCart(): Promise<unknown>;
    getDeliverySlots(): Promise<unknown>;
    setDeliverySlot(slotId: string): Promise<unknown>;
    confirmOrder(orderId: string): Promise<unknown>;
  };
  delivery: {
    getDeliveries(): Promise<unknown>;
    getDelivery(deliveryId: string): Promise<unknown>;
    cancelDelivery(deliveryId: string): Promise<unknown>;
    setDeliveryRating(deliveryId: string, rating: number): Promise<unknown>;
  };
  payment: {
    getPaymentProfile(): Promise<unknown>;
    getWalletTransactions(): Promise<unknown>;
  };
  user: { getUserDetails(): Promise<unknown> };
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
  client: PicnicClient,
  operation: string,
  getNodeParameter: (name: string) => string | number,
): Promise<IDataObject> {
  if (operation === 'searchProducts') {
    const query = getNodeParameter('query') as string;
    if (!query || !query.trim()) {
      return [] as unknown as IDataObject;
    }
    return (await client.catalog.search(query)) as IDataObject;
  }

  if (operation === 'getProductDetails') {
    const productId = getNodeParameter('productId') as string;
    return (await client.catalog.getProductDetails(productId)) as IDataObject;
  }

  if (operation === 'getCart') {
    return (await client.cart.getCart()) as IDataObject;
  }

  if (operation === 'addToCart') {
    const productId = getNodeParameter('productId') as string;
    const count = getNodeParameter('count') as number;
    return (await client.cart.addProductToCart(productId, count)) as IDataObject;
  }

  if (operation === 'removeFromCart') {
    const productId = getNodeParameter('productId') as string;
    const count = getNodeParameter('count') as number;
    return (await client.cart.removeProductFromCart(productId, count)) as IDataObject;
  }

  if (operation === 'clearCart') {
    return (await client.cart.clearCart()) as IDataObject;
  }

  if (operation === 'getDeliverySlots') {
    return (await client.cart.getDeliverySlots()) as IDataObject;
  }

  if (operation === 'setDeliverySlot') {
    const slotId = getNodeParameter('slotId') as string;
    return (await client.cart.setDeliverySlot(slotId)) as IDataObject;
  }

  if (operation === 'confirmOrder') {
    const orderId = getNodeParameter('orderId') as string;
    return (await client.cart.confirmOrder(orderId)) as IDataObject;
  }

  if (operation === 'getDeliveries') {
    return (await client.delivery.getDeliveries()) as IDataObject;
  }

  if (operation === 'getDelivery') {
    const deliveryId = getNodeParameter('deliveryId') as string;
    return (await client.delivery.getDelivery(deliveryId)) as IDataObject;
  }

  if (operation === 'cancelDelivery') {
    const deliveryId = getNodeParameter('deliveryId') as string;
    return (await client.delivery.cancelDelivery(deliveryId)) as IDataObject;
  }

  if (operation === 'setDeliveryRating') {
    const deliveryId = getNodeParameter('deliveryId') as string;
    const rating = getNodeParameter('rating') as number;
    return (await client.delivery.setDeliveryRating(deliveryId, rating)) as IDataObject;
  }

  if (operation === 'getPaymentProfile') {
    return (await client.payment.getPaymentProfile()) as IDataObject;
  }

  if (operation === 'getWalletTransactions') {
    return (await client.payment.getWalletTransactions()) as IDataObject;
  }

  if (operation === 'getUserDetails') {
    return (await client.user.getUserDetails()) as IDataObject;
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
          { name: 'Get Product Details', value: 'getProductDetails', action: 'Get product details' },
          { name: 'Get Cart', value: 'getCart', action: 'Get cart' },
          { name: 'Add Product To Cart', value: 'addToCart', action: 'Add product to cart' },
          { name: 'Remove Product From Cart', value: 'removeFromCart', action: 'Remove product from cart' },
          { name: 'Clear Cart', value: 'clearCart', action: 'Clear cart' },
          { name: 'Get Delivery Slots', value: 'getDeliverySlots', action: 'Get delivery slots' },
          { name: 'Set Delivery Slot', value: 'setDeliverySlot', action: 'Set delivery slot' },
          { name: 'Confirm Order', value: 'confirmOrder', action: 'Confirm order' },
          { name: 'Get Deliveries', value: 'getDeliveries', action: 'Get deliveries' },
          { name: 'Get Delivery', value: 'getDelivery', action: 'Get delivery' },
          { name: 'Cancel Delivery', value: 'cancelDelivery', action: 'Cancel delivery' },
          { name: 'Set Delivery Rating', value: 'setDeliveryRating', action: 'Set delivery rating' },
          { name: 'Get Payment Profile', value: 'getPaymentProfile', action: 'Get payment profile' },
          { name: 'Get Wallet Transactions', value: 'getWalletTransactions', action: 'Get wallet transactions' },
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
            operation: ['addToCart', 'removeFromCart', 'getProductDetails'],
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
            operation: ['addToCart', 'removeFromCart'],
          },
        },
      },
      {
        displayName: 'Delivery ID',
        name: 'deliveryId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            operation: ['getDelivery', 'cancelDelivery', 'setDeliveryRating'],
          },
        },
      },
      {
        displayName: 'Rating',
        name: 'rating',
        type: 'number',
        required: true,
        default: 5,
        typeOptions: {
          minValue: 1,
          maxValue: 10,
        },
        displayOptions: {
          show: {
            operation: ['setDeliveryRating'],
          },
        },
      },
      {
        displayName: 'Slot ID',
        name: 'slotId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            operation: ['setDeliverySlot'],
          },
        },
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            operation: ['confirmOrder'],
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
        // Build a cache key whenever userId is available so that a fresh login token
        // can be cached and reused even when a (possibly stale) configuredAuthKey is set.
        const cacheKey = userId ? buildAuthCacheKey(userId, countryCode, apiVersion) : undefined;
        const cachedAuthKey = cacheKey ? getCachedAuthKey(cacheKey) : undefined;
        // Prefer a freshly cached login token over a potentially stale configured auth key.
        const initialAuthKey = cachedAuthKey || configuredAuthKey;

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
          responseData = await executeOperation(client, operation, (name) =>
            this.getNodeParameter(name, itemIndex) as string | number,
          );
        } catch (error) {
          // Retry once on 401/403: clear the stale token, re-login and repeat the request.
          // This handles both the cached-key case and a configuredAuthKey that has expired
          // on the server side (when email + password are also provided as a fallback).
          if (isLikelyAuthError(error) && userId && password) {
            if (cacheKey) clearCachedAuthKey(cacheKey);

            const retryClient = new PicnicAPI({
              countryCode,
              apiVersion,
            });

            await ensurePicnicAuthenticated(retryClient, '', userId, password);

            const refreshedAuthKey = getClientAuthKey(retryClient);
            if (refreshedAuthKey && cacheKey) {
              setCachedAuthKey(cacheKey, refreshedAuthKey);
            }

            responseData = await executeOperation(
              retryClient,
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
