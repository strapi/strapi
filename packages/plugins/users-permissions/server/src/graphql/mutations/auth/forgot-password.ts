import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../context';

import { checkBadRequest } from '../../utils';
import { createRateLimitRunner } from './rate-limit';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/forgot-password');

  return {
    type: 'UsersPermissionsPasswordPayload',

    args: {
      email: nonNull('String'),
    },

    description: 'Request a reset password token',

    async resolve(_parent: unknown, args: { email: string }, context: GraphQLContext) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        getController(strapi, 'auth').forgotPassword(ctx)
      );

      checkBadRequest(output);

      return {
        ok: output.ok || output,
      };
    },
  };
};
