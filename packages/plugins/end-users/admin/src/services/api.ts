import { adminApi } from '@strapi/admin/strapi-admin';

const endUsersApi = adminApi.enhanceEndpoints({
  addTagTypes: [
    'EndUsersRole',
    'EndUsersLayout',
    'EndUsersCondition',
    'EndUsersSettings',
    'EndUsersUserSecurity',
    'EndUsersProvider',
  ],
});

export { endUsersApi };
