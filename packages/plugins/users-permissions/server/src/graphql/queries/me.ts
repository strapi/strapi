import type { GraphQLContext } from '../context';

export default () => ({
  type: 'UsersPermissionsMe',

  args: {},

  resolve(_parent: unknown, _args: unknown, context: GraphQLContext) {
    const { user } = context.state ?? {};

    if (!user) {
      throw new Error('Authentication requested');
    }

    return user;
  },
});
