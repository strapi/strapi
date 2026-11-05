import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../context';

import { checkBadRequest } from '../../utils';
import { createRateLimitRunner } from './rate-limit';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/local');

  return {
    type: nonNull('UsersPermissionsLoginPayload'),

    args: {
      input: nonNull('UsersPermissionsLoginInput'),
    },

    async resolve(
      _parent: unknown,
      args: { input: { identifier: string; password: string; provider?: string } },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      const output = await runRateLimit(
        koaContext,
        {
          body: toPlainObject(args.input),
          params: { provider: args.input.provider },
        },
        (ctx) => getController(strapi, 'auth').callback(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
