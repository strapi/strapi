import { policy } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { assertAutoReload } from '../utils/auto-reload';

const { createPolicy } = policy;

/**
 * `plugin::end-users.is-development`: Strapi runs with `autoReload` (`strapi develop`). The builder's
 * writes change files and restart the server, which is for development only; anywhere else the
 * answer is 403 with code `DEVELOPMENT_ONLY`. Run it after the admin is known to be
 * signed in and to hold `conditions.update`, so only an authorised admin learns the environment.
 */
export const isDevelopment = createPolicy({
  name: 'plugin::end-users.is-development',
  handler(_ctx: unknown, _config: unknown, { strapi }: { strapi: Core.Strapi }) {
    assertAutoReload(strapi);

    return true;
  },
});

export default isDevelopment;
