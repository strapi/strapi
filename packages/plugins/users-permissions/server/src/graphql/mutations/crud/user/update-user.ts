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
      id: nonNull('ID'),
      data: nonNull(userInputName),
    },

    description: 'Update an existing user',

    async resolve(
      _parent: unknown,
      args: { id: string; data: Record<string, unknown> },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      koaContext.params = { id: args.id };
      koaContext.request.body = toPlainObject(args.data);

      await getController(strapi, 'user').update(koaContext);

      checkBadRequest(koaContext.body);

      return {
        value: koaContext.body,
        info: { args, resourceUID: 'plugin::users-permissions.user' },
      };
    },
  };
};
