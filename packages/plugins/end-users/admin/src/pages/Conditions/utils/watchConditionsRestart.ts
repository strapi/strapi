const TIMEOUT = 'timeout';

const timeout = 30 * 1000;

/**
 * How long one status request may take. `strapi develop` restarts by replacing its cluster worker,
 * and a request that reaches the server during the swap can be accepted and never answered. The
 * browser then waits minutes for it, and the overall timeout above is only checked between
 * requests. A request that takes longer than this is aborted and the next one is sent.
 */
const requestTimeout = 5 * 1000;

const retryDelay = 200;

type ConditionsStatusResponse = {
  data?: {
    isUpdating?: boolean;
  };
};

type GetConditionsStatus = (
  url: string,
  options: { signal: AbortSignal }
) => Promise<{ data?: ConditionsStatusResponse } | undefined>;

/**
 * Resolves once the server reports that it no longer waits for a builder write to restart it
 * (`GET /end-users/conditions/status`), the way the Content-Type Builder waits for its own restart.
 * Throws `Error('timeout')` when that takes longer than 30 s. A failed or unanswered request counts
 * as "still updating": the server is going down or coming up.
 */
export const watchConditionsRestart = async (
  get: GetConditionsStatus,
  { initTime, signal }: { initTime?: number; signal?: AbortSignal } = {}
) => {
  const startTime = initTime ?? Date.now();

  const isUpdating = async () => {
    // The caller unmounted: send no more requests. Each request gets a signal of its own, so an
    // aborted caller signal would not stop the next one.
    if (signal?.aborted) {
      return true;
    }

    const request = new AbortController();
    const abort = () => request.abort();
    const timer = setTimeout(abort, requestTimeout);
    signal?.addEventListener('abort', abort);

    try {
      const res = await get(`/end-users/conditions/status`, { signal: request.signal });

      return res?.data?.data?.isUpdating === true;
    } catch {
      return true;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };

  for (;;) {
    if (Date.now() - startTime > timeout) {
      throw new Error(TIMEOUT);
    }

    if (!(await isUpdating())) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
};

/** What `watchConditionsRestart` throws when the server doesn't come back in time */
export const isRestartTimeout = (error: unknown) =>
  error instanceof Error && error.message === TIMEOUT;
