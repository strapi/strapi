import type { Core } from '@strapi/types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // The query scope holds a reference to this Strapi instance, so it has to go
  // when the instance does — otherwise a second instance in the same process
  // (which is how the tests run) would filter through the first one's context.
  strapi.db.queryScopes.unregister('spaces');
  strapi.service('admin::permission').setUserRolesScope(null);
};
