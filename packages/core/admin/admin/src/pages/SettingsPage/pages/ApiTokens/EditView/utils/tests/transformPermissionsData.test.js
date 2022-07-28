import transformPermissionsData from '../transformPermissionsData';
import { data } from './dataMock';

describe('ADMIN | Container | SettingsPage | ApiTokens | EditView | utils | transformPermissionsData', () => {
  it('should return transformed data correctly', () => {
    expect(transformPermissionsData(data)).toEqual({
      collectionTypes: {
        'api::category': {
          create: false,
          findOne: false,
          find: false,
          update: false,
          delete: false,
        },
        'api::country': {
          create: false,
          findOne: false,
          find: false,
          update: false,
          delete: false,
        },
      },
      singleTypes: {
        'api::homepage': {
          create: false,
          find: false,
          update: false,
        },
      },
      custom: {
        'api::ticket': {
          getTicket: false,
          createTicket: false,
        },
      },
    });
  });
});
