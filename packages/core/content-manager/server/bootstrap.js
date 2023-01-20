'use strict';

const { getService } = require('./utils');

module.exports = async () => {
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();

  // TODO: V5, remove this warning
  if (strapi.config.get('server.webhooks.populateRelations', true)) {
    process.emitWarning(
      '[deprecated] Relations population in webhooks is enabled. This is not recommended for production and will degrade performance. ' +
        'Please set `server.webhooks.populateRelations` to `false` in your `config/server.js` file.'
    );
  }
};
