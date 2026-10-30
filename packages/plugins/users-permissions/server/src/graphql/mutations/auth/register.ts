import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../context';

import { checkBadRequest } from '../../utils';
import { createRateLimitRunner } from './rate-limit';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/local/register');

  return {
    type: nonNull('UsersPermissionsLoginPayload'),

    args: {
      input: nonNull('UsersPermissionsRegisterInput'),
    },

    description: 'Register a user',

    async resolve(
      _parent: unknown,
      args: { input: { username: string; email: string; password: string } },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args.input) }, (ctx) =>
        getController(strapi, 'auth').register(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
