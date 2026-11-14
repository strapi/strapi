import { errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { getService } from '../utils';

import { createEntriesController } from './entries';
import { createSettingsController } from './settings';
import { createTokensController } from './tokens';

type Handlers = Record<string, (ctx: Context) => Promise<void>>;

/**
 * Without the license feature the plugin has no routes, as far as callers can tell.
 */
const licensed =
  <THandlers extends Handlers>(create: (deps: { strapi: Core.Strapi }) => THandlers) =>
  ({ strapi }: { strapi: Core.Strapi }) =>
    Object.fromEntries(
      Object.entries(create({ strapi })).map(([name, handler]) => [
        name,
        async (ctx: Context) => {
          if (!getService(strapi, 'settings').isProvenanceEnabled()) {
            throw new errors.NotFoundError();
          }

          return handler(ctx);
        },
      ])
    ) as THandlers;

export default {
  entries: licensed(createEntriesController),
  settings: licensed(createSettingsController),
  tokens: licensed(createTokensController),
};
