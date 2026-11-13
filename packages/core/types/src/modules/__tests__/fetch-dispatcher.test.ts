/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * `strapi.fetch.dispatcher` accepts any undici dispatcher, whatever undici version the app holds,
 * and keeps rejecting values that are not dispatchers.
 */
import { Agent, Dispatcher1Wrapper, ProxyAgent } from 'undici';

import type { Modules } from '../..';

declare const fetch: Modules.Fetch.Fetch;

// undici 8 agents, and the wrapper @strapi/core assigns when a proxy is configured
fetch.dispatcher = new Agent();
fetch.dispatcher = new ProxyAgent('http://localhost:1740');
fetch.dispatcher = new Dispatcher1Wrapper(new ProxyAgent('http://localhost:1740'));

// Any object with undici's `dispatch` signature, whatever its option and handler types, as the
// agents of undici 6 and 7 have
declare const olderUndiciDispatch: (
  options: { path: string; method: 'QUERY' },
  handler: { onBodySent?: () => void }
) => boolean;
fetch.dispatcher = { dispatch: olderUndiciDispatch };

fetch.dispatcher = undefined;

// @ts-expect-error a string is not a dispatcher
fetch.dispatcher = 'dispatcher';

// @ts-expect-error an object without `dispatch` is not a dispatcher
fetch.dispatcher = { close: () => Promise.resolve() };

// @ts-expect-error `dispatch` must return whether the dispatcher can take more requests
fetch.dispatcher = { dispatch: () => Promise.resolve() };
