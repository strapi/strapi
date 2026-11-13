import type { GraphQLFactoryContext } from '../context';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.objectType({
    name: 'UsersPermissionsMeRole',

    definition(t) {
      t.nonNull.id('id');
      t.nonNull.string('name');
      t.string('description');
      t.string('type');
    },
  });
};
