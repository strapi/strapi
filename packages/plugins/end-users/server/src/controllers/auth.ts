import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';
import { toFetchRequest, writeFetchResponse } from '../engine/better-auth/handler';
import type { AuthEngine } from '../engine/types';

const READS = new Set(['GET', 'HEAD']);

/**
 * A read (GET, HEAD) sent by a page of an origin that is not trusted. The engine checks the origin
 * of a write that comes with the cookie, but not of a read, and a browser sends the cookie with a
 * cross-origin fetch (`SameSite=None`). Such a fetch always sends `Origin`; a link followed or a
 * page loaded (an OAuth callback, an emailed link) sends none, and is never judged by its Referer.
 */
const isReadFromUntrustedPage = async (ctx: Koa.Context, engine: AuthEngine) => {
  const { origin } = ctx.request.headers;

  if (!READS.has(ctx.method.toUpperCase()) || origin === undefined) {
    return false;
  }

  return origin === '' || origin === 'null' || !(await engine.isTrustedOrigin(origin));
};

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

    if (await isReadFromUntrustedPage(ctx, engine)) {
      // Signed out for this request: the answer (get-session and list-sessions hold session
      // tokens) must not reach a page the CORS rules might let read it
      delete ctx.request.headers.cookie;
    }

    const request = toFetchRequest(ctx, resolveServerOrigin(strapi.config));

    await writeFetchResponse(ctx, await engine.handle(request));
  },
});

export default authController;
