import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../context';

import { checkBadRequest } from '../../utils';
import { createRateLimitRunner } from './rate-limit';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/reset-password');

  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      password: nonNull('String'),
      passwordConfirmation: nonNull('String'),
      code: nonNull('String'),
    },

    description: 'Reset user password. Confirm with a code (resetToken from forgotPassword)',

    async resolve(
      _parent: unknown,
      args: { code: string; password: string; passwordConfirmation: string },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        getController(strapi, 'auth').resetPassword(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
