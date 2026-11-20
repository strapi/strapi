import type { Core } from '@strapi/types';

import { getService } from './utils';
import { createServiceUtils } from './services/utils';

export const registerHistoryAuthors = (strapi: Core.Strapi) => {
  const authors = getService(strapi, 'history-authors');
  const { findAdminUserNames, findApiTokenNames } = createServiceUtils({ strapi });

  authors.registerProvider({
    strategy: 'admin',
    type: 'person',
    model: 'admin::user',
    getRecordId: (credentials) => credentials?.id,
    findNames: findAdminUserNames,
  });

  (['admin-token', 'content-api-token'] as const).forEach((strategy) => {
    authors.registerProvider({
      strategy,
      type: 'token',
      model: 'admin::api-token',
      getRecordId: (credentials) => credentials?.id,
      findNames: findApiTokenNames,
    });
  });
};
