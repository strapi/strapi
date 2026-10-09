import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext, AuthResponse } from '../../context';

import { checkBadRequest } from '../../utils';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;

  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      confirmation: nonNull('String'),
    },

    description: 'Confirm an email users email address',

    async resolve(_parent: unknown, args: { confirmation: string }, context: GraphQLContext) {
      const { koaContext } = context;

      koaContext.query = toPlainObject(args);

      await getController(strapi, 'auth').emailConfirmation(koaContext, undefined, true);

      const output = koaContext.body as AuthResponse;

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
