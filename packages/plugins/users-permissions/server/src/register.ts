import fs from 'fs';
import path from 'path';

import registerGraphql from './graphql';
import authStrategy from './strategies/users-permissions';
import sanitizers from './utils/sanitize/sanitizers';

export default ({ strapi }) => {
  strapi.get('auth').register('content-api', authStrategy);
  strapi.sanitizers.add('content-api.output', sanitizers.defaultSanitizeOutput);

  if (strapi.plugin('graphql')) {
    registerGraphql({ strapi });
  }

  if (strapi.plugin('documentation')) {
    const specPath = path.join(__dirname, '../../documentation/content-api.yaml');
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
