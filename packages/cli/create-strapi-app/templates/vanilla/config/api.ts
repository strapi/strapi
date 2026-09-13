import { factories } from '@strapi/strapi';

export default factories.defineApiConfig({
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
    strictParams: true,
  },
  documents: {
    strictParams: true,
    strictRelations: true,
  },
});
