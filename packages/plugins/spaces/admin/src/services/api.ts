import { adminApi } from '@strapi/admin/strapi-admin';

const spacesApi = adminApi.enhanceEndpoints({
  addTagTypes: ['Space'],
});

export { spacesApi };
