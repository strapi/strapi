import { adminApi } from '@strapi/admin/strapi-admin';

const spacesApi = adminApi.enhanceEndpoints({
  // `ReleaseAction` belongs to content-releases: providing it lets their
  // mutations refresh the per-workspace release status.
  addTagTypes: ['Space', 'ReleaseAction'],
});

export { spacesApi };
