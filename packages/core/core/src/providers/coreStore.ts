import type { Core } from '@strapi/types';

import { createCoreStore, coreStoreModel } from '../services/core-store';

export default {
  init(strapi: Core.Strapi) {
    strapi.get('models').add(coreStoreModel);
    strapi.add('coreStore', () => createCoreStore({ db: strapi.db }));
  },
};
