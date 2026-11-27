import lodash from 'lodash';
import { getController } from '../../../utils';
import type { GraphQLFactoryContext, GraphQLContext } from '../../context';

import { checkBadRequest } from '../../utils';
import { createRateLimitRunner } from './rate-limit';

const { toPlainObject } = lodash;

export default ({ nexus, strapi }: GraphQLFactoryContext) => {
  const { nonNull } = nexus;
  const runRateLimit = createRateLimitRunner(strapi, '/auth/change-password');

  return {
    type: 'UsersPermissionsLoginPayload',

    args: {
      currentPassword: nonNull('String'),
      password: nonNull('String'),
      passwordConfirmation: nonNull('String'),
    },

    description: 'Change user password. Confirm with the current password.',

    async resolve(
      _parent: unknown,
      args: { currentPassword: string; password: string; passwordConfirmation: string },
      context: GraphQLContext
    ) {
      const { koaContext } = context;

      const output = await runRateLimit(koaContext, { body: toPlainObject(args) }, (ctx) =>
        getController(strapi, 'auth').changePassword(ctx)
      );

      checkBadRequest(output);

      return {
        user: output.user || output,
        jwt: output.jwt,
      };
    },
  };
};
