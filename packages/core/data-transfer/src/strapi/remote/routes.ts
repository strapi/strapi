// eslint-disable-next-line node/no-extraneous-import
import type { Context } from 'koa';

import { TRANSFER_URL } from './constants';
import { createTransferHandler } from './handlers';

// Extend Strapi interface type to access the admin routes' API
// TODO: Remove this when the Strapi instances will be better typed
declare module '@strapi/strapi' {
  interface Strapi {
    admin: {
      routes: {
        method: string;
        path: string;
        handler: (ctx: Context) => Promise<void>;
        config: unknown;
      }[];
    };
  }
}

/**
 * Register a transfer route in the Strapi admin router.
 *
 * It exposes a WS server that can be used to run and manage transfer processes.
 *
 * @param strapi - A Strapi instance
 */
export const registerAdminTransferRoute = (strapi: Strapi.Strapi) => {
  strapi.admin.routes.push({
    method: 'GET',
    path: TRANSFER_URL,
    handler: createTransferHandler(),
    config: { auth: false },
  });
};
