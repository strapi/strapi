import type { Core } from '@strapi/types';

import { getService } from './utils';
import { createServiceUtils, resolveAdminTokenOwnerId } from './services/utils';

export const registerHistoryAuthors = (strapi: Core.Strapi) => {
  const authors = getService(strapi, 'history-authors');
  const { findAdminUserNames, findApiTokenNames } = createServiceUtils({ strapi });

  authors.unstable_registerProvider({
    strategy: 'admin',
    type: 'person',
    model: 'admin::user',
    getRecordId: (credentials) => credentials?.id,
    findNames: findAdminUserNames,
  });

  (['admin-token', 'mcp'] as const).forEach((strategy) => {
    authors.unstable_registerProvider({
      strategy,
      type: 'person',
      model: 'admin::user',
      getRecordId: resolveAdminTokenOwnerId,
      findNames: findAdminUserNames,
    });
  });

  authors.unstable_registerProvider({
    strategy: 'content-api-token',
    type: 'token',
    model: 'admin::api-token',
    getRecordId: (credentials) => credentials?.id,
    findNames: findApiTokenNames,
  });
};
