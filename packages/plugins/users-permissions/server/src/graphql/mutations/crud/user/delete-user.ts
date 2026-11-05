import { getController } from '../../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../../context';
import { checkBadRequest } from '../../../utils';

const usersPermissionsUserUID = 'plugin::users-permissions.user';

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const { getEntityResponseName } = strapi.plugin('graphql').service('utils').naming;

  const userContentType = strapi.getModel(usersPermissionsUserUID);

  const responseName = getEntityResponseName(userContentType);

  return {
    type: nonNull(responseName),

    args: {
      id: nonNull('ID'),
    },

    description: 'Delete an existing user',

    async resolve(_parent: unknown, args: { id: string }, context: GraphQLContext) {
      const { koaContext } = context;

      koaContext.params = { id: args.id };

      await getController(strapi, 'user').destroy(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
