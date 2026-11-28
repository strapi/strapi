import * as React from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';

import { watchConditionsRestart } from './watchConditionsRestart';

/**
 * Waits for the server to be back after a builder write: polls `GET /end-users/conditions/status`
 * every 200 ms until `isUpdating` is false, for 30 s at most, as the Content-Type Builder's
 * `useServerRestartWatcher` does. Stops sending requests when the page unmounts.
 */
export const useConditionsRestartWatcher = () => {
  const { get } = useFetchClient();
  // Aborts the request in flight when the component unmounts, as useFetchClient's own signal did.
  // watchConditionsRestart passes each request a signal of its own, which replaces that one.
  const unmount = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    unmount.current = controller;

    return () => controller.abort();
  }, []);

  return React.useCallback(
    (initTime?: number) =>
      watchConditionsRestart(get, { initTime, signal: unmount.current?.signal ?? undefined }),
    [get]
  );
};
