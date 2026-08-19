import { errors, file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { Context, Next } from 'koa';

import type { Config } from '../types';

const { PayloadTooLargeError } = errors;
const { bytesToHumanReadable } = fileUtils;

/**
 * Envelope allowance for the single-file endpoints below. `Content-Length`
 * covers the whole multipart body — boundaries, part headers and the small
 * `fileInfo` JSON field — not just the file bytes, so a modest fixed margin
 * keeps the check from rejecting a file that is in fact under the limit.
 */
const ENVELOPE_MARGIN = 1024 * 1024; // 1 MiB

/**
 * Routes this fast path is allowed to guard.
 *
 * `sizeLimit` is a **per-file** limit (`checkFileSize` runs once per file) while
 * `Content-Length` describes the whole request, so comparing the two is only
 * sound where the endpoint accepts exactly one file. `POST /upload` (legacy
 * admin) and `POST /api/upload` (content API) both accept many: two 750 MB files
 * are perfectly valid under a 1 GB per-file limit even though their envelope is
 * not, and guarding them here would reject legitimate uploads. They keep relying
 * on the exact post-parse check.
 *
 * `POST /upload?id=<id>` replaces a file through the legacy multiplexer, but it
 * is deliberately left out: the request is only a replacement when the `id`
 * query param is present, and keying a size decision off a query param is a
 * sharper edge than the wasted bytes are worth. It keeps the post-parse check.
 *
 * Paths are the mounted ones: the plugin's admin routes get a `/upload` prefix
 * and the admin API itself adds none.
 */
const SINGLE_FILE_UPLOAD_PATTERNS = [
  // `POST /upload/files` — new media library, exactly one file per request.
  /^\/upload\/files$/,
  // `POST /upload/files/:id/replace` — rejects multi-file input outright
  // (`Cannot replace a file with multiple ones`) and is backstopped by the
  // `checkFileSize` call in `uploadService.replace`.
  /^\/upload\/files\/[^/]+\/replace$/,
];

const isGuardedRoute = (ctx: Context) =>
  ctx.method === 'POST' && SINGLE_FILE_UPLOAD_PATTERNS.some((pattern) => pattern.test(ctx.path));

/**
 * Reads `Content-Length` off the raw headers.
 *
 * Never `ctx.request.length`, which Koa truncates with `~~len` to a signed
 * 32-bit int — a 3 GB upload would overflow negative and skip the check
 * entirely. `Number()` alone is too permissive the other way (`'1e9'`, `'0x10'`,
 * padded values), so require plain digits first.
 *
 * `undefined` means "can't tell, don't reject": chunked bodies legitimately omit
 * the header, and the post-parse check is still authoritative.
 */
const getContentLength = (ctx: Context): number | undefined => {
  const raw = ctx.get('content-length');

  if (!/^\d+$/.test(raw)) {
    return undefined;
  }

  const length = Number(raw);

  return Number.isSafeInteger(length) ? length : undefined;
};

/**
 * The effective per-file size limit, read fresh per request because config isn't
 * final at plugin-register time.
 *
 * Mirrors the precedence the local provider applies in `checkFileSize`: the
 * deprecated `providerOptions.sizeLimit` wins over the plugin-level `sizeLimit`
 * when set. Keeping the two in step matters — a fast path using a *larger* limit
 * than the authoritative check would be pointless, and one using a smaller limit
 * would reject files the provider would have accepted.
 */
const getSizeLimit = (strapi: Core.Strapi): number | undefined => {
  const config = strapi.config.get<Config | undefined>('plugin::upload');

  // TODO V5: remove providerOptions sizeLimit
  const providerOptionsSizeLimit = config?.providerOptions?.sizeLimit;

  if (typeof providerOptionsSizeLimit === 'number') {
    return providerOptionsSizeLimit;
  }

  return typeof config?.sizeLimit === 'number' ? config.sizeLimit : undefined;
};

/**
 * Rejects a single-file upload whose `Content-Length` already exceeds the plugin
 * `sizeLimit`, before the body middleware streams it to temp disk.
 *
 * Without this, a file that clears the body middleware's `maxFileSize` but not
 * the plugin's `sizeLimit` is written out in full and only then rejected by
 * `checkFileSize` — which is the wasted-upload problem this fixes. With stock
 * config the body limit (200 MB) is the smaller of the two and trips first; this
 * matters once `maxFileSize` is raised or `sizeLimit` lowered.
 *
 * This does not replace `checkFileSize`: an absent, lying or malformed header
 * still falls through to it.
 */
export const shouldRejectOversizedUpload = (ctx: Context, strapi: Core.Strapi) => {
  if (!isGuardedRoute(ctx) || !ctx.is('multipart')) {
    return undefined;
  }

  const sizeLimit = getSizeLimit(strapi);
  if (!sizeLimit) {
    return undefined;
  }

  const contentLength = getContentLength(ctx);
  if (contentLength === undefined || contentLength <= sizeLimit + ENVELOPE_MARGIN) {
    return undefined;
  }

  return { sizeLimit };
};

/**
 * Installs the fast path by wrapping `strapi::body`.
 *
 * Route-level middleware is too late to help: routes are mounted after the
 * global middleware stack is built, so a route middleware only runs once
 * `strapi::body` has already consumed the whole request — saving the provider
 * and DB work, but not the streaming, which is the entire point.
 *
 * Extending `strapi::body` instead puts the check exactly where the user placed
 * that middleware — after `strapi::errors`, `strapi::cors` and
 * `strapi::security` in the default ordering — so the thrown
 * `PayloadTooLargeError` is formatted by the normal error middleware and CORS
 * headers are already set. Registering it as a global `strapi.server.use()`
 * would land *before* those and force a hand-rolled copy of Strapi's error
 * formatting.
 *
 * Called from the plugin's `register()`, which runs after `loadMiddlewares` has
 * populated the registry. `extend` throws on an unknown uid, so an ordering
 * regression here fails loudly at boot rather than silently dropping the check.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const wrapBodyMiddleware =
    (bodyMiddleware: Core.MiddlewareFactory): Core.MiddlewareFactory =>
    (config, context) => {
      const bodyHandler = bodyMiddleware(config, context);

      // A factory is allowed to return nothing, meaning "no handler to run".
      // Nothing to guard in that case — and nothing would parse the body either.
      if (!bodyHandler) {
        return undefined;
      }

      return async (ctx: Context, next: Next) => {
        const violation = shouldRejectOversizedUpload(ctx, strapi);

        if (violation) {
          // Throwing before the body is read is what stops the upload: the
          // request is never drained, so the sender stalls on backpressure
          // almost immediately (measured <1% of a 200 MiB body).
          //
          // Deliberately no `Connection: close` — it doesn't make the send stop
          // any earlier, and it makes a fast sender hit EPIPE before the 413
          // body flushes, costing the client the error message.
          throw new PayloadTooLargeError(
            `The file exceeds size limit of ${bytesToHumanReadable(violation.sizeLimit)}.`
          );
        }

        return bodyHandler(ctx, next);
      };
    };

  strapi.get('middlewares').extend('strapi::body', wrapBodyMiddleware);
};
