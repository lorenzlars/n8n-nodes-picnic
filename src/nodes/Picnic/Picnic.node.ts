import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { callClientMethod } from './client-methods';
import { ensurePicnicAuthenticated } from './login';

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
        const authKey = ((credentials.authKey as string) || '').trim();

        const { default: PicnicAPI } = await import('picnic-api');

        const client = new PicnicAPI({
          countryCode,
          apiVersion,
          authKey: authKey || undefined,
        }) as any;

        try {
          await ensurePicnicAuthenticated(client, authKey, userId, password);
        } catch (error) {
          throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex });
        }

        let responseData: IDataObject | IDataObject[];

        if (operation === 'searchProducts') {
          const query = this.getNodeParameter('query', itemIndex) as string;
          responseData = (await callClientMethod<IDataObject>(
            client,
            'searchProducts',
            ['search'],
            query,
          )) as IDataObject;
        } else if (operation === 'getCart') {
          responseData = (await callClientMethod<IDataObject>(client, 'getCart', [
            'getShoppingCart',
            'getCart',
          ])) as IDataObject;
        } else if (operation === 'addToCart') {
          const productId = this.getNodeParameter('productId', itemIndex) as string;
          const count = this.getNodeParameter('count', itemIndex) as number;
          responseData = (await callClientMethod<IDataObject>(
            client,
            'addToCart',
            ['addProductToShoppingCart'],
            productId,
            count,
          )) as IDataObject;
        } else if (operation === 'clearCart') {
          responseData = (await callClientMethod<IDataObject>(client, 'clearCart', [
            'clearShoppingCart',
            'clearCart',
          ])) as IDataObject;
        } else if (operation === 'getDeliveries') {
          responseData = (await callClientMethod<IDataObject>(client, 'getDeliveries', [
            'getDeliveries',
          ])) as IDataObject;
        } else if (operation === 'getUserDetails') {
          responseData = (await callClientMethod<IDataObject>(client, 'getUserDetails', [
            'getUserDetails',
          ])) as IDataObject;
        } else {
          throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
            itemIndex,
          });
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
