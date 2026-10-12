import { login } from '../reducer';
import { adminApi } from '../services/api';
import { getRunningAdminIdentityQueries } from '../services/auth';

import { notifyOtherTabsOfAdminSessionChange } from './adminSessionSync';

import type { Dispatch } from '../core/store/configure';

let adminIdentityRefreshGeneration = 0;

/**
 * Invalidate `Me` after identity queries that are already running have settled,
 * then let RTK Query refetch under the token currently in storage.
 *
 * Those queries are keyed only by endpoint. RTK Query 1.9 will not start a
 * refetch while the cache entry is pending, so an invalidate during an
 * old-bearer `getMe` / `getMyPermissions` is dropped and that response writes
 * the previous user. Waiting first lets the stale response land, then replaces
 * it. `getRunningQueryThunk` is the public handle for each in-flight request.
 *
 * Overlapping refreshes share one trailing invalidation. A newer session
 * change must not be discarded behind an earlier invalidate, and settling must
 * not schedule another refetch of the request it just waited for.
 *
 * Do not call `resetApiState` here. That wipes `/admin/init` as well, so
 * first-admin signup refetches `hasAdmin: true` while AuthPage is still
 * mounted and redirects to Home instead of `/usecase`.
 */
const refreshAdminIdentity = (dispatch: Dispatch): void => {
  const generation = ++adminIdentityRefreshGeneration;

  void drainRunningIdentityQueries(dispatch, generation).catch(() => {
    // allSettled does not reject. This only covers an unexpected throw.
  });
};

const drainRunningIdentityQueries = async (dispatch: Dispatch, generation: number) => {
  const seen = new Set<ReturnType<typeof getRunningAdminIdentityQueries>[number]>();

  for (;;) {
    if (generation !== adminIdentityRefreshGeneration) {
      return;
    }

    const running = getRunningAdminIdentityQueries(dispatch).filter((query) => !seen.has(query));

    if (running.length === 0) {
      break;
    }

    for (const query of running) {
      seen.add(query);
    }

    // The two identity endpoints settle together. A later wave is only queries
    // that started while this wait was in progress; they would drop the invalidate.
    await Promise.allSettled(running);
  }

  if (generation !== adminIdentityRefreshGeneration) {
    return;
  }

  dispatch(adminApi.util.invalidateTags(['Me']));
};

/**
 * Establish a new admin session and refetch identity queries. `getMe` /
 * `getMyPermissions` are keyed only by endpoint, not by token, so swapping
 * the token without invalidating them keeps the previous user's menus until
 * a full reload (see #27367).
 *
 * Store the token before refreshing. The fetch client reads the bearer token
 * from storage when the refetch starts. Invalidating earlier (for example
 * from the login mutation) refetches as the previous user.
 *
 * @see https://github.com/strapi/strapi/issues/27367
 */
const establishAdminSession = (
  dispatch: Dispatch,
  payload: { token: string; persist?: boolean }
): void => {
  dispatch(login(payload));
  notifyOtherTabsOfAdminSessionChange();
  refreshAdminIdentity(dispatch);
};

export { establishAdminSession, refreshAdminIdentity };
