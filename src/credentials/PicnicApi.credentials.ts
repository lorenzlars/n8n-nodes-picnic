import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PicnicApi implements ICredentialType {
  name = 'picnicApi';

  displayName = 'Picnic API';

  documentationUrl = 'https://www.npmjs.com/package/picnic-api';

  properties: INodeProperties[] = [
    {
      displayName: 'Country Code',
      name: 'countryCode',
      type: 'options',
      default: 'NL',
      options: [
        { name: 'Netherlands (NL)', value: 'NL' },
        { name: 'Germany (DE)', value: 'DE' },
        { name: 'France (FR)', value: 'FR' },
      ],
    },
    {
      displayName: 'API Version',
      name: 'apiVersion',
      type: 'string',
      default: '15',
      description: 'Picnic API version used by picnic-api client',
    },
    {
      displayName: 'Auth Key (Optional)',
      name: 'authKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'If set, this key is used directly and no login is done',
    },
    {
      displayName: 'Email / User ID',
      name: 'userId',
      type: 'string',
      default: '',
      description: 'Needed only if Auth Key is not set',
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Needed only if Auth Key is not set',
    },
  ];
}
