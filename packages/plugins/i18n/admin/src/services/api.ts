import { adminApi } from '@strapi/admin/strapi-admin';

const i18nApi = adminApi.enhanceEndpoints({
  addTagTypes: ['Locale', 'KeyStatistics'],
});

export { i18nApi };
