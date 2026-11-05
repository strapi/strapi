import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsLoginPayload',

    definition(t) {
      t.string('jwt');
      t.nonNull.field('user', { type: 'UsersPermissionsMe' });
    },
  });
};
