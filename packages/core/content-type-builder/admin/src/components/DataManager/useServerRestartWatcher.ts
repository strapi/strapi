import * as React from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';

import { watchServerRestart } from './watchServerRestart';

export const useServerRestartWatcher = () => {
  const { get } = useFetchClient();
  // Aborts the request in flight when the component unmounts, as useFetchClient's own signal did.
  // watchServerRestart passes each request a signal of its own, which replaces that one.
  const unmount = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    unmount.current = controller;

    return () => controller.abort();
  }, []);

  return React.useCallback(
    (initTime?: number) =>
      watchServerRestart(get, { initTime, signal: unmount.current?.signal ?? undefined }),
    [get]
  );
};
