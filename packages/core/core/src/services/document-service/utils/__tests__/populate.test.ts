import { LoadedStrapi } from '@strapi/types';
import { PRODUCT_UID, models } from '../../transform/__tests__/utils';
import { getDeepPopulate } from '../populate';

describe('populate', () => {
  global.strapi = {
    getModel: (uid: string) => models[uid],
  } as unknown as LoadedStrapi;

  it('should return a populate object', async () => {
    const populate = await getDeepPopulate(PRODUCT_UID);
    expect(populate).toEqual({});
  });
});
