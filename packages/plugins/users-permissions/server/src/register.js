'use strict';

const fs = require('fs');
const path = require('path');

const authStrategy = require('./strategies/users-permissions');
const sanitizers = require('./utils/sanitize/sanitizers');

module.exports = ({ strapi }) => {
  strapi.get('auth').register('content-api', authStrategy);
  strapi.sanitizers.add('content-api.output', sanitizers.defaultSanitizeOutput);

  const historyAuthors = strapi.plugin('content-manager')?.service('history-authors');

  historyAuthors?.registerProvider({
    strategy: 'users-permissions',
    type: 'person',
    model: 'plugin::users-permissions.user',
    getRecordId(credentials) {
      return credentials?.id;
    },
    async findNames(documentIds) {
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        select: ['documentId', 'username'],
        where: { documentId: { $in: documentIds } },
      });

      return Object.fromEntries(users.map((user) => [user.documentId, user.username]));
    },
  });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
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
