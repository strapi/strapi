import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';
import { toFetchRequest, writeFetchResponse } from '../engine/better-auth/handler';
import type { AuthEngine } from '../engine/types';

/**
 * The catch-all behind `/api/auth/*`: the request goes to the authentication engine as a Fetch
 * `Request`, and the engine's answer, cookies and headers included, is written back as it is.
 */
const authController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async handle(ctx: Koa.Context) {
    const engines = strapi.plugin(PLUGIN_ID).service('engine');

    // A start-up setting that changed is applied before this request, so it never runs on the
    // engine built from the old one. When the rebuild fails the engine in place keeps answering
    // (the strategy enforces email verification on every Content API request, so failing closed
    // here would lock everyone out); the engine service logs the cause and limits the retries.
    await engines.ensureCurrent().catch(() => undefined);

    const engine: AuthEngine = engines.get();
    const request = toFetchRequest(ctx, resolveServerOrigin(strapi.config));

    await writeFetchResponse(ctx, await engine.handle(request));
  },
});

export default authController;
