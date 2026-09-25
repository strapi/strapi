import type { Context } from '../../types';

const registerInternals = ({ registry, strapi }: Context) => {
  const { buildInternalTypes } = strapi.plugin('graphql').service('internals');

  const internalTypes = buildInternalTypes();

  for (const [kind, definitions] of Object.entries(internalTypes)) {
    registry.registerMany(Object.entries(definitions as any), { kind });
  }
};

export { registerInternals };
