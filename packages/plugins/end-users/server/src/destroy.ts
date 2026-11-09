import type { Core } from '@strapi/types';

import { PLUGIN_ID } from './constants';
import type compatService from './services/compat';

/** Longest shutdown waits for the hit counts to be written */
export const FLUSH_TIMEOUT_MS = 5_000;

const destroy = async ({ strapi }: { strapi: Core.Strapi }) => {
  let timer: NodeJS.Timeout | undefined;

  try {
    // Hits still waiting in memory are written before the process goes, but never at the price of
    // a shutdown that hangs or throws
    const compat = strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        strapi.log.warn('Timed out writing the legacy token counts at shutdown');
        resolve();
      }, FLUSH_TIMEOUT_MS);
    });

    await Promise.race([compat.flush(), timeout]);
  } catch (error) {
    strapi.log.warn(
      `Could not write the legacy token counts at shutdown: ${(error as Error).message}`
    );
  } finally {
    clearTimeout(timer);
  }
};

export default destroy;
