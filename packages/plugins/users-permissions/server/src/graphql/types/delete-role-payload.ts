import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsDeleteRolePayload',

    definition(t) {
      t.nonNull.boolean('ok');
    },
  });
};
