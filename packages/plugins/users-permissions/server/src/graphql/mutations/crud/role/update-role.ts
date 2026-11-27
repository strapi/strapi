import { getController } from '../../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../../context';

const usersPermissionsRoleUID = 'plugin::users-permissions.role';

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { getContentTypeInputName } = strapi.plugin('graphql').service('utils').naming;
  const { nonNull } = nexus;

  const roleContentType = strapi.getModel(usersPermissionsRoleUID);

  const roleInputName = getContentTypeInputName(roleContentType);

  return {
    type: 'UsersPermissionsUpdateRolePayload',

    args: {
      id: nonNull('ID'),
      data: nonNull(roleInputName),
    },

    description: 'Update an existing role',

    async resolve(
      _parent: unknown,
      args: { id: string; data: Record<string, unknown> },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      koaContext.params = { role: args.id };
      koaContext.request.body = args.data;
      koaContext.request.body.role = args.id;

      await getController(strapi, 'role').updateRole(koaContext);

      return { ok: true };
    },
  };
};
