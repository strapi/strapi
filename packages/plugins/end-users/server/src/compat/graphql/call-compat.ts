import type { Context } from 'koa';
import { errors } from '@strapi/utils';

import { PLUGIN_ID } from '../../constants';
import { resolveBasePath } from '../../engine/better-auth/base-path';
import { isEndpointAllowed } from '../../middlewares/endpoint-allowlist';
import { toHeaders } from '../../engine/better-auth/handler';
import { resolveServerOrigin } from '../../engine/better-auth/server-origin';
import type { AuthEngine } from '../../engine/types';

const FALLBACK_MESSAGE = 'Bad Request';

/** The message and the code of an answer that refused, from the envelope or Better Auth's own body. */
const refusalOf = (body: unknown, status: number) => {
  const { error, message, code } = (body ?? {}) as {
    error?: { message?: unknown; details?: { code?: unknown } };
    message?: unknown;
    code?: unknown;
  };
  const text = [error?.message, message].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate !== ''
  );
  const given = error?.details?.code ?? code;

  return {
    message: text ?? FALLBACK_MESSAGE,
    details: { status, ...(typeof given === 'string' ? { code: given } : {}) },
  };
};

const parse = (text: string): unknown => {
  try {
    return text === '' ? null : JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Runs one of the compat routes (`/local`, `/forgot-password`, ...) for a GraphQL operation, as the
 * request it would be over REST: the caller's own headers go with it (the Bearer token, the cookie,
 * the client address) and it goes through `engine.handle`, so the rate limits, the lockout and the
 * password policy apply to it exactly as they do to the route, and so does the endpoint allow-list. Nothing is signed in, signed up or
 * changed here.
 *
 * Returns the parsed body of the answer, or throws an `ApplicationError` with the message of the
 * refusal (its status and code are in `details`), which is what a GraphQL client sees as the error.
 */
export const callCompat = async (ctx: Context, path: string, body: unknown): Promise<unknown> => {
  const engines = strapi.plugin(PLUGIN_ID).service('engine');

  // A start-up setting that changed is applied before this request, as the REST catch-all does
  await engines.ensureCurrent().catch(() => undefined);

  // The allow-list the REST route applies: a method that is turned off answers as a missing endpoint
  if (!(await isEndpointAllowed(strapi, path))) {
    throw new errors.ApplicationError('Not Found', { status: 404 });
  }

  const engine: AuthEngine = engines.get();
  const origin = new URL(resolveServerOrigin(strapi.config));
  const headers = toHeaders(ctx, origin);

  headers.set('content-type', 'application/json');

  const response = await engine.handle(
    new Request(`${origin.origin}${resolveBasePath(strapi.config)}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    })
  );
  const parsed = parse(await response.text());

  if (response.status >= 400) {
    const { message, details } = refusalOf(parsed, response.status);

    throw new errors.ApplicationError(message, details);
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('The compat route did not answer with a body.');
  }

  return parsed;
};
