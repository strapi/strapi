import type { Core, Data } from '@strapi/types';

import fs from 'fs';
import registerGraphQL from './graphql';

import { instantiateStockActions } from './controllers/create-extensible-controller';
import authStrategy from './strategies/users-permissions';
import { defaultSanitizeOutput } from './utils/sanitize/sanitizers';

/** Register instance-bound authentication, sanitizers, and optional plugin integrations. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  // Extensions that spread a stock controller keep delegates that need this instance.
  instantiateStockActions(strapi);
  strapi.get('auth').register('content-api', authStrategy({ strapi }));
  strapi.sanitizers.add('content-api.output', defaultSanitizeOutput(strapi));

  const historyAuthors = strapi.plugin('content-manager')?.service('history-authors');

  historyAuthors?.unstable_registerProvider({
    strategy: 'users-permissions',
    type: 'person',
    model: 'plugin::users-permissions.user',
    getRecordId({ credentials }: { credentials?: { id?: Data.ID } | null }) {
      return credentials?.id;
    },
    async findNames(documentIds: string[]) {
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        select: ['documentId', 'username'],
        where: { documentId: { $in: documentIds } },
      });

      return Object.fromEntries(users.map((user) => [user.documentId, user.username]));
    },
  });

  if (strapi.plugin('graphql')) {
    registerGraphQL({ strapi });
  }

  if (strapi.plugin('documentation')) {
    const specPath = new URL('../../documentation/content-api.yaml', import.meta.url);
    const spec = fs.readFileSync(specPath, 'utf8');

    strapi
      .plugin('documentation')
      .service('override')
      .registerOverride(spec, {
        pluginOrigin: 'users-permissions',
        excludeFromGeneration: ['users-permissions'],
      });
  }
};
