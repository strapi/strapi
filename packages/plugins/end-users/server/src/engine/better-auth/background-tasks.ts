import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';

const reasonOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'unknown error';
};

/**
 * Better Auth's `advanced.backgroundTasks.handler`: the work it does not need to wait for (the
 * emails it sends, the dummy work that hides whether an address has an account) runs after the
 * response is sent. Without a handler Better Auth awaits it, so a known address takes as long as
 * its email does to answer and an unknown one does not, which tells a caller which is which.
 * A failure has no request left to answer, so it is logged.
 */
export const backgroundTaskHandler =
  (strapi: Core.Strapi) =>
  (task: Promise<unknown>): void => {
    task.catch((error: unknown) => {
      strapi.log.error(`${PLUGIN_ID}: a background task failed (${reasonOf(error)}).`);
    });
  };
