import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsMe',

    definition(t) {
      t.nonNull.id('id');
      t.nonNull.id('documentId');
      t.nonNull.string('username');
      t.string('email');
      t.boolean('confirmed');
      t.boolean('blocked');
      t.field('role', { type: 'UsersPermissionsMeRole' });
    },
  });
};
