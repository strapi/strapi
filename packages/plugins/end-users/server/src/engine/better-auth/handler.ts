/**
 * Koa <-> Fetch bridge for Better Auth, whose handler takes a `Request` and returns a `Response`.
 *
 * The request side rebuilds the request from what Koa has already parsed: Strapi's body parser has
 * consumed the raw stream, so the body is serialised again from `ctx.request.body`. The content type
 * is never changed to suit the body: Better Auth only takes JSON (and, on a few sign-in endpoints,
 * forms) and answers 415 to the rest, and that decision must be made on the type the client sent. A
 * body Strapi parsed as multipart goes on as multipart, not as JSON, or a cross-site `<form>` post
 * (no preflight, no cookies) would reach every JSON-only endpoint.
 *
 * Address: the Request is addressed to the origin Strapi is configured with (`server.url`), with only
 * the path and the query taken from Koa. The client's `Host` is not used for anything: it would let
 * a forged header decide where the links Better Auth emails point. `host`, `x-forwarded-host` and
 * `x-forwarded-proto` are rewritten to the configured values for the same reason.
 *
 * Client address: the one and only `X-Forwarded-For` sent on is `ctx.request.ip`, whatever the client
 * sent under that name is discarded, so Better Auth (which reads the client address, for rate limits
 * and for sessions, from this header and only takes a single value) never sees a chain. What
 * `ctx.request.ip` is depends on Strapi's proxy setting. Off (the default), it is the socket's
 * address. On (`server.proxy.koa`), it is the first address Koa believes in: with `maxIpsCount` 0,
 * the default, that is the LEFTMOST `X-Forwarded-For` entry, which the client wrote; with
 * `maxIpsCount` set to the number of proxies in front of Strapi it is the entry the nearest one
 * added. Forwarding Koa's answer keeps this plugin in line with the rest of Strapi; trusting it is a
 * decision about that setting, not about this function.
 */
import type { Context } from 'koa';

import { resolveServerOrigin } from './server-origin';

/** Headers that describe the connection or the body of one hop, not the message. */
const SKIPPED_REQUEST_HEADERS = new Set(['content-length', 'transfer-encoding', 'connection']);
const SKIPPED_RESPONSE_HEADERS = new Set(['content-length', 'transfer-encoding', 'connection']);

/**
 * Response headers other middleware (CORS) also writes, and that carry a list. Overwriting them
 * would drop what the other writer put there (`Vary: Origin` in particular), so the values are
 * merged instead.
 */
const LIST_HEADERS = new Set(['vary', 'access-control-expose-headers']);

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

const FORM = 'application/x-www-form-urlencoded';
const MULTIPART = 'multipart/form-data';

/** The path and query Koa received, whatever form the request target arrived in. */
const pathAndQuery = (ctx: Context) => {
  const target = ctx.originalUrl;

  if (target.startsWith('/')) {
    return target;
  }

  // An absolute-form target (`http://host/path`): the host in it is as untrusted as a Host header
  try {
    const url = new URL(target);

    return `${url.pathname}${url.search}`;
  } catch {
    return '/';
  }
};

/**
 * The headers of the Request built for the context: what the client sent, with the connection's
 * own headers dropped and the address and host set from Strapi's own view, never the client's.
 */
export const toHeaders = (ctx: Context, origin: URL) => {
  const headers = new Headers();

  for (const [name, value] of Object.entries(ctx.request.headers)) {
    if (value === undefined || SKIPPED_REQUEST_HEADERS.has(name)) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }

  headers.delete('x-forwarded-for');

  if (ctx.request.ip) {
    headers.set('x-forwarded-for', ctx.request.ip);
  }

  headers.set('host', origin.host);
  headers.set('x-forwarded-host', origin.host);
  headers.set('x-forwarded-proto', origin.protocol.replace(':', ''));

  return headers;
};

const toForm = (body: Record<string, unknown>) => {
  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(body)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) {
        form.append(key, String(item));
      }
    }
  }

  return form.toString();
};

const toFormData = (body: Record<string, unknown>) => {
  const form = new FormData();

  for (const [key, value] of Object.entries(body)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) {
        form.append(key, String(item));
      }
    }
  }

  return form;
};

/**
 * The media type of a `Content-Type` header: what comes before the parameters, without white space,
 * in lower case. A parameter's value can contain anything (`text/plain; x=multipart/form-data`), so
 * the type is never found by searching the whole header.
 */
const mediaTypeOf = (contentType: string | null) =>
  (contentType ?? '').split(';')[0].trim().toLowerCase();

/**
 * The body to send, or `undefined` for none. It may change `headers`, but only to keep them true to
 * the body (a multipart body needs the boundary of the new one).
 */
const toBody = (ctx: Context, headers: Headers) => {
  const parsed = (ctx.request as { body?: unknown }).body;

  if (BODYLESS_METHODS.has(ctx.method) || parsed === undefined || parsed === null) {
    return undefined;
  }

  if (typeof parsed === 'string' || Buffer.isBuffer(parsed)) {
    return parsed;
  }

  if (typeof parsed !== 'object') {
    return String(parsed);
  }

  const type = mediaTypeOf(headers.get('content-type'));

  // Strapi's body parser (koa-body) leaves `{}` for every method it does not parse (DELETE, OPTIONS
  // and the like), whether or not the client sent anything. An object that is empty and came without
  // a content type is that, not a body: sending it would put `{}` on the request as `text/plain`.
  if (type === '' && Object.keys(parsed).length === 0) {
    return undefined;
  }

  if (type === FORM) {
    return toForm(parsed as Record<string, unknown>);
  }

  if (type === MULTIPART) {
    // The original boundary belongs to a body that no longer exists: the Request sets its own
    headers.delete('content-type');

    return toFormData(parsed as Record<string, unknown>);
  }

  // What is left is what the parser reads as JSON; it keeps the content type it came with
  return JSON.stringify(parsed);
};

/**
 * The path of the Request `toFetchRequest` builds for this context: what Better Auth routes on.
 *
 * It is not `ctx.path`. The Fetch API resolves dot segments (`/x/../admin` is `/admin`, and so is
 * `/x/%2e%2e/admin`) and Koa does not, so a check made on Koa's path can pass a request that Better
 * Auth then routes somewhere else. Anything that decides on the path before the request is handed
 * over (the endpoint allow-list) decides on this one.
 *
 * Only the path is used; the origin here is a placeholder, because the path is all that is taken.
 */
export const requestPathname = (ctx: Context): string =>
  new URL(`http://localhost${pathAndQuery(ctx)}`).pathname;

/**
 * `origin` is the server's configured origin; it is read from Strapi's configuration unless given.
 */
export const toFetchRequest = (ctx: Context, origin?: string): Request => {
  const base = new URL(origin ?? resolveServerOrigin(strapi.config));
  const headers = toHeaders(ctx, base);
  const body = toBody(ctx, headers);

  return new Request(`${base.origin}${pathAndQuery(ctx)}`, {
    method: ctx.method,
    headers,
    body: body === undefined ? undefined : (body as RequestInit['body']),
  });
};

const tokens = (value: string) =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

/** `existing` and `added` as one list, without the same token (any case) twice. */
const mergeList = (existing: string, added: string) => {
  const seen = new Set<string>();

  return [...tokens(existing), ...tokens(added)].filter((token) => {
    const key = token.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

export const writeFetchResponse = async (ctx: Context, response: Response): Promise<void> => {
  const payload = Buffer.from(await response.arrayBuffer());

  // The body first, then the status. An empty body is an explicit `null`: left unset, Koa would
  // answer with the status text, and assigning `null` after a 302 would turn it into a 204.
  ctx.body = payload.length > 0 ? payload : null;
  ctx.status = response.status;

  response.headers.forEach((value, name) => {
    const header = name.toLowerCase();

    if (header === 'set-cookie' || SKIPPED_RESPONSE_HEADERS.has(header)) {
      return;
    }

    if (LIST_HEADERS.has(header)) {
      ctx.set(name, mergeList(ctx.response.get(name), value).join(', '));

      return;
    }

    ctx.set(name, value);
  });

  // Appended, not set: other middleware may already have cookies on this response
  const cookies = response.headers.getSetCookie();

  if (cookies.length > 0) {
    ctx.append('Set-Cookie', cookies);
  }
};
