import { getController } from '../../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../../context';

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;

  return {
    type: 'UsersPermissionsDeleteRolePayload',

    args: {
      id: nonNull('ID'),
    },

    description: 'Delete an existing role',

    async resolve(_parent: unknown, args: { id: string }, context: GraphQLContext) {
      const { koaContext } = context;

      koaContext.params = { role: args.id };

      await getController(strapi, 'role').deleteRole(koaContext);

      return { ok: true };
    },
  };
};
