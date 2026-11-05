import lodash from 'lodash';
import { getController } from '../../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../../context';

const { toPlainObject } = lodash;

const usersPermissionsRoleUID = 'plugin::users-permissions.role';

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { getContentTypeInputName } = strapi.plugin('graphql').service('utils').naming;
  const { nonNull } = nexus;

  const roleContentType = strapi.getModel(usersPermissionsRoleUID);

  const roleInputName = getContentTypeInputName(roleContentType);

  return {
    type: 'UsersPermissionsCreateRolePayload',

    args: {
      data: nonNull(roleInputName),
    },

    description: 'Create a new role',

    async resolve(
      _parent: unknown,
      args: { data: Record<string, unknown> },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      koaContext.request.body = toPlainObject(args.data);

      await getController(strapi, 'role').createRole(koaContext);

      return { ok: true };
    },
  };
};
