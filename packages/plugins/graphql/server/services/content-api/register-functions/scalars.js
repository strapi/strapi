'use strict';

const registerScalars = ({ registry, strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { scalars } = getService('internals');
  const { KINDS } = getService('constants');

  Object.entries(scalars).forEach(([name, definition]) => {
    registry.register(name, definition, { kind: KINDS.scalar });
  });
};

module.exports = { registerScalars };
