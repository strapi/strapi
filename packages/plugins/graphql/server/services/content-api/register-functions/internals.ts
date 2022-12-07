import { RegisterArg } from '../../../types/registerFunctions';

const registerInternals = ({ registry, strapi }: RegisterArg) => {
  const { buildInternalTypes } = strapi.plugin('graphql').service('internals');

  const internalTypes = buildInternalTypes({ strapi });

  for (const [kind, definitions] of Object.entries(internalTypes)) {
    registry.registerMany(Object.entries(definitions as any), { kind });
  }
};

export { registerInternals };
