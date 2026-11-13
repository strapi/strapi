import type Koa from 'koa';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { frontendCallback, isProviderEnabled, resolveFrontendCallback } from '../compat/connect';
import { PLUGIN_ID } from '../constants';
import { resolveBasePath } from '../engine/better-auth/base-path';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';
import { writeFetchResponse } from '../engine/better-auth/handler';
import type { AuthEngine } from '../engine/types';

/** What a provider's failure becomes on the way back to the front end. */
const OAUTH_ERROR = 'oauth_error';

/** The longest `error_description` passed on to the front end. */
const MAX_DESCRIPTION = 200;

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** The headers of the request this server makes to the engine for the browser's request. */
const forwardedHeaders = (ctx: Koa.Context, extra: Record<string, string> = {}): Headers => {
  const headers = new Headers(extra);
  const userAgent = ctx.get('user-agent');

  if (ctx.request.ip) {
    headers.set('x-forwarded-for', ctx.request.ip);
  }

  if (userAgent) {
    headers.set('user-agent', userAgent);
  }

  return headers;
};

const isRedirect = (status: number) => status >= 300 && status < 400;

/** The cookies a response sets, as a request would send them back: the ones that were not cleared. */
const cookieHeaderOf = (response: Response): string =>
  response.headers
    .getSetCookie()
    .filter((line) => !/;\s*max-age=0\b/i.test(line))
    .map((line) => line.split(';')[0])
    .filter((pair) => !pair.endsWith('='))
    .join('; ');

/**
 * The redirect the engine answered the callback with, for the front end: a failure it reports as
 * `?error=<code>` is `?error=oauth_error&error_description=<the code or the description>`, which
 * is what Users & Permissions' front ends read. An engine error page (it had no front-end URL to
 * go to: the state was lost) goes to the default front-end URL instead.
 */
const forFrontEnd = (strapi: Core.Strapi, provider: string, location: string): string => {
  const url = new URL(location, resolveServerOrigin(strapi.config));
  const error = url.searchParams.get('error');

  if (error === null) {
    return location;
  }

  const description = (url.searchParams.get('error_description') ?? error).slice(
    0,
    MAX_DESCRIPTION
  );
  const onEnginePage = url.pathname.startsWith(`${resolveBasePath(strapi.config)}/`);
  const target = onEnginePage
    ? new URL(frontendCallback(strapi, provider, undefined) ?? url.href)
    : url;

  target.searchParams.delete('error');
  target.searchParams.delete('error_description');
  target.searchParams.set('error', OAUTH_ERROR);
  target.searchParams.set('error_description', description);

  return target.href;
};

/**
 * `GET /api/connect/:provider` and `GET /api/connect/:provider/callback`: the Users & Permissions
 * OAuth routes, while the compatibility mode is on. The engine does the OAuth (its state, PKCE and
 * account linking); these two routes are the addresses a browser and a provider know.
 */
const connectController = ({ strapi }: { strapi: Core.Strapi }) => {
  const engineOf = (): AuthEngine => strapi.plugin(PLUGIN_ID).service('engine').get();
  const endpoint = (path: string) =>
    `${resolveServerOrigin(strapi.config)}${resolveBasePath(strapi.config)}${path}`;

  return {
    /** Starts the sign-in: a 302 to the provider, with the engine's state cookies on it. */
    async start(ctx: Koa.Context) {
      const { provider } = ctx.params as { provider: string };

      if (!(await isProviderEnabled(strapi, provider))) {
        throw new errors.ApplicationError('This provider is disabled');
      }

      const engines = strapi.plugin(PLUGIN_ID).service('engine');

      await engines.ensureCurrent().catch(() => undefined);

      const engine = engineOf();
      const front = await resolveFrontendCallback(
        strapi,
        engine,
        provider,
        asText((ctx.query as Record<string, unknown>).callback)
      );

      if (front === null) {
        throw new errors.ApplicationError('Provider callback URL is not configured');
      }

      const response = await engine.handle(
        new Request(endpoint('/sign-in/social'), {
          method: 'POST',
          headers: forwardedHeaders(ctx, { 'content-type': 'application/json' }),
          body: JSON.stringify({
            provider,
            callbackURL: front,
            errorCallbackURL: front,
            disableRedirect: true,
          }),
        })
      );
      const { url } = (await response.json().catch(() => ({}))) as { url?: unknown };

      if (!response.ok || typeof url !== 'string') {
        throw new errors.ApplicationError('The provider sign-in could not be started');
      }

      const cookies = response.headers.getSetCookie();

      if (cookies.length > 0) {
        ctx.append('Set-Cookie', cookies);
      }

      ctx.redirect(url);
    },

    /** The provider's return: the engine finishes the sign-in, and the browser lands on the front end. */
    async callback(ctx: Koa.Context) {
      const { provider } = ctx.params as { provider: string };

      if (!(await isProviderEnabled(strapi, provider))) {
        throw new errors.ApplicationError('This provider is disabled');
      }

      const engine = engineOf();
      const target = endpoint(`/callback/${encodeURIComponent(provider)}`);
      const response = await engine.handle(
        new Request(`${target}${ctx.search}`, {
          method: 'GET',
          headers: forwardedHeaders(ctx, { cookie: ctx.get('cookie') }),
          redirect: 'manual',
        })
      );
      const location = response.headers.get('location');

      if (!isRedirect(response.status) || location === null) {
        return writeFetchResponse(ctx, response);
      }

      const headers = new Headers(response.headers);
      const front = forFrontEnd(strapi, provider, location);

      // A sign-in that went through made the session this provider's exchange may take, once
      if (!new URL(front, resolveServerOrigin(strapi.config)).searchParams.has('error')) {
        const made = await engine.getSession(new Headers({ cookie: cookieHeaderOf(response) }));

        if (made) {
          await engine.markProviderSession(made.id, provider);
        }
      }

      headers.set('location', front);

      return writeFetchResponse(ctx, new Response(null, { status: response.status, headers }));
    },
  };
};

export default connectController;
