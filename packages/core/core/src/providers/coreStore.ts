import { defineProvider } from './provider';
import { createCoreStore, coreStoreModel } from '../services/core-store';

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(coreStoreModel);
    strapi.add('coreStore', () => createCoreStore({ db: strapi.db }));
  },
});
