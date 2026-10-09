import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsCreateRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
