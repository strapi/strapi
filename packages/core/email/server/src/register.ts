import type { Core } from '@strapi/types';

export const TEMPLATE_UID = 'plugin::email.template';

export const register = ({ strapi }: { strapi: Core.Strapi }) => {
  if (strapi.plugin('graphql')) {
    // Stored templates are internal; the admin routes are the only way to read or edit them.
    strapi.plugin('graphql').service('extension').shadowCRUD(TEMPLATE_UID).disable();
  }
};
