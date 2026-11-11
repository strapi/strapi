import { defineProvider } from './provider';
import { pendingRelationModel } from '../services/document-service/utils/pending-relations';

export default defineProvider({
  init(strapi) {
    strapi.get('models').add(pendingRelationModel);
  },
});
