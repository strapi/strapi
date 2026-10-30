import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsUpdateRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
