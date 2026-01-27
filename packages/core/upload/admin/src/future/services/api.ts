import { adminApi } from '@strapi/admin/strapi-admin';

const uploadApi = adminApi.enhanceEndpoints({
  addTagTypes: ['Asset', 'Folder'],
});

export { uploadApi };
