'use strict';

const registerInternals = ({ registry, strapi }) => {
  const { buildInternalTypes } = strapi.plugin('graphql').service('internals');

  const internalTypes = buildInternalTypes({ strapi });

  for (const [kind, definitions] of Object.entries(internalTypes)) {
    registry.registerMany(Object.entries(definitions), { kind });
  }
};

module.exports = { registerInternals };
