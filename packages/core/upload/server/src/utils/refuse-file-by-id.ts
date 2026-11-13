import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

/**
 * Files have no owner and no data rule of their own, so a caller whose Content API permissions are
 * narrowed by conditions (an end-users caller with a role) can't be limited to the files they
 * uploaded. Replacing, updating or deleting one by id is refused for them rather than left open to
 * every file. API tokens, Users & Permissions and the admin have no active checker and keep what
 * they have today. REST and GraphQL share this so both refuse the same way.
 */
export const refuseFileById = (strapi: Core.Strapi, auth: unknown) => {
  if (strapi.contentAPI.permissions.checker.isActive(auth as any)) {
    throw new errors.ForbiddenError(
      'Replacing, updating or deleting a file by id is not allowed for this caller'
    );
  }
};
