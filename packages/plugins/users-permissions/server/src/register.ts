import type { Core } from '@strapi/types';

import fs from 'fs';
import registerGraphQL from './graphql';

import authStrategy from './strategies/users-permissions';
import { defaultSanitizeOutput } from './utils/sanitize/sanitizers';

/** Register instance-bound authentication, sanitizers, and optional plugin integrations. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.get('auth').register('content-api', authStrategy({ strapi }));
  strapi.sanitizers.add('content-api.output', defaultSanitizeOutput(strapi));

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
