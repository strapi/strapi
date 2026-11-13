import lodash from 'lodash';
import { getController } from '../../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../../context';

import { checkBadRequest } from '../../../utils';

const { toPlainObject } = lodash;

const usersPermissionsUserUID = 'plugin::users-permissions.user';

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const { getContentTypeInputName, getEntityResponseName } = strapi
    .plugin('graphql')
    .service('utils').naming;

  const userContentType = strapi.getModel(usersPermissionsUserUID);

  const userInputName = getContentTypeInputName(userContentType);
  const responseName = getEntityResponseName(userContentType);

  return {
    type: nonNull(responseName),

    args: {
      data: nonNull(userInputName),
    },

    description: 'Create a new user',

    async resolve(
      _parent: unknown,
      args: { data: Record<string, unknown> },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      koaContext.params = {};
      koaContext.request.body = toPlainObject(args.data);

      await getController(strapi, 'user').create(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
