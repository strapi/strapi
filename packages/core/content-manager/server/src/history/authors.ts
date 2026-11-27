import type { Core } from '@strapi/types';

import { getService } from './utils';
import { createServiceUtils } from './services/utils';

export const registerHistoryAuthors = (strapi: Core.Strapi) => {
  const authors = getService(strapi, 'history-authors');
  const { findAdminUserNames, findApiTokenNames } = createServiceUtils({ strapi });

  (['admin', 'admin-token', 'mcp'] as const).forEach((strategy) => {
    authors.unstable_registerProvider({
      strategy,
      type: 'person',
      model: 'admin::user',
      getRecordId: ({ user }) => user?.id,
      findNames: findAdminUserNames,
    });
  });

  authors.unstable_registerProvider({
    strategy: 'content-api-token',
    type: 'token',
    model: 'admin::api-token',
    getRecordId: ({ credentials }) => credentials?.id,
    findNames: findApiTokenNames,
  });
};
