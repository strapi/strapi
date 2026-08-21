import fse from 'fs-extra';
import { defaultsDeep } from 'lodash/fp';
import { koaBody, KoaBodyMiddlewareOptions } from 'koa-body';
import mime from 'mime-types';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

export type Config = KoaBodyMiddlewareOptions;

const defaults = {
  multipart: true,
  patchKoa: true,
};

/**
 * Formidable's own defaults, mirrored here because koa-body 6.0.1 doesn't
 * re-export them: it forwards `config.formidable` straight to formidable 2.1.5,
 * which applies these when the option is absent.
 *
 * @see https://github.com/node-formidable/formidable/blob/v2.1.5/src/Formidable.js
 */
const FORMIDABLE_DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MiB
const FORMIDABLE_DEFAULT_MAX_FIELDS_SIZE = 20 * 1024 * 1024; // 20 MiB

/**
 * Headroom added on top of the file + field limits to account for the multipart
 * envelope itself (boundaries, per-part headers). Those aren't strictly bounded,
 * so this is deliberately generous: the header check exists to kill obvious
 * violations, and anything borderline falls through to formidable's exact
 * per-chunk enforcement.
 */
const MULTIPART_ENVELOPE_MARGIN = 1024 * 1024; // 1 MiB

/**
 * koa-body only parses (and therefore only enforces size limits) for the
 * methods in `parsedMethods`, defaulting to POST/PUT/PATCH.
 *
 * @see https://github.com/koajs/koa-body/blob/v6.0.1/src/index.ts
 */
const DEFAULT_PARSED_METHODS = ['POST', 'PUT', 'PATCH'];

/**
 * Reads `Content-Length` off the raw headers.
 *
 * Deliberately not `ctx.request.length`: Koa runs the header through `~~len`,
 * a signed 32-bit truncation, so a 3 GB body overflows negative and would
 * silently skip every size check. `Number()` is too lax in the other direction —
 * it happily accepts `'1e9'`, `'0x10'` and whitespace, none of which are legal
 * HTTP values — hence the strict digits-only test first.
 *
 * Returns `undefined` for an absent or malformed header, which means "no fast
 * path": chunked/streamed bodies legitimately omit `Content-Length`, and the
 * existing mid-stream enforcement remains the backstop either way.
 */
function getContentLength(ctx: Koa.Context): number | undefined {
  const raw = ctx.get('content-length');

  if (!/^\d+$/.test(raw)) {
    return undefined;
  }

  const length = Number(raw);

  return Number.isSafeInteger(length) ? length : undefined;
}

/**
 * Whether a multipart request can be rejected from its `Content-Length` alone,
 * before a single body byte is read.
 *
 * This mirrors formidable 2.1.5's enforcement rather than reimplementing it:
 * there, `maxFileSize` is checked against a cumulative `_fileSize` that is
 * instance state and never reset between parts, making it an aggregate limit
 * across all files in the request — so an aggregate comparison here is the
 * matching shape. On top of that formidable allows up to `maxFieldsSize` of
 * non-file field data, which `Content-Length` also covers, so both budgets plus
 * an envelope margin have to be cleared before we call a request oversized.
 *
 * It stays a heuristic — multipart boundaries and part headers aren't bounded —
 * so it only ever rejects clear violations and never replaces the exact check.
 */
function isOversizedMultipart(ctx: Koa.Context, config: Config): boolean {
  // Match koa-body's gating: it neither parses nor enforces anything when
  // multipart is off or the method isn't opted in, so neither do we.
  if (!config.multipart || !ctx.is('multipart')) {
    return false;
  }

  const parsedMethods = config.parsedMethods ?? DEFAULT_PARSED_METHODS;
  if (!parsedMethods.includes(ctx.method.toUpperCase() as (typeof parsedMethods)[number])) {
    return false;
  }

  const contentLength = getContentLength(ctx);
  if (contentLength === undefined) {
    return false;
  }

  const { maxFileSize = FORMIDABLE_DEFAULT_MAX_FILE_SIZE, maxFieldsSize } = config.formidable ?? {};
  // `maxFieldsSize` only applies when formidable buffers fields in memory;
  // `multiples`-style streaming configs aside, the default is what it uses.
  const fieldsAllowance = maxFieldsSize ?? FORMIDABLE_DEFAULT_MAX_FIELDS_SIZE;

  return contentLength > maxFileSize + fieldsAllowance + MULTIPART_ENVELOPE_MARGIN;
}

function ensureFileMimeType(file: any): void {
  if (!file.type) {
    file.type = mime.lookup(file.name) || 'application/octet-stream';
  }
}

function getFiles(ctx: Koa.Context) {
  return ctx?.request?.files?.files;
}

const bodyMiddleware: Core.MiddlewareFactory<Config> = (config, { strapi }) => {
  const bodyConfig: Config = defaultsDeep(defaults, config);

  let gqlEndpoint: string | undefined;
  if (strapi.plugin('graphql')) {
    const { config: gqlConfig } = strapi.plugin('graphql');
    gqlEndpoint = gqlConfig('endpoint');
  }

  return async (ctx, next) => {
    // TODO: find a better way later
    if (gqlEndpoint && ctx.url === gqlEndpoint) {
      await next();
    } else {
      if (isOversizedMultipart(ctx, bodyConfig)) {
        // Signal that the connection is finished so the browser stops uploading.
        //
        // Responding early is NOT enough on its own: measured in Chrome with a
        // 300 MiB body, answering without this header still let the browser
        // push 100% of the bytes before surfacing the 413 — the response sits
        // unread while the upload drains, which is the whole bug. With the
        // header, Chrome stops at ~0.3% and still parses the 413 body.
        //
        // The trade-off is Firefox, which treats the early close as a network
        // error (`onerror`, status 0) instead of reading the response, so it
        // loses the message and reports a generic failure. That is accepted:
        // stopping a multi-hundred-MB upload matters more than the wording of
        // the error, and Firefox never exposes the response at all here — it
        // does not even reach HEADERS_RECEIVED, so no client-side handling can
        // recover it.
        ctx.set('Connection', 'close');

        // Same error code as the post-parse path below, so the admin's
        // `apiError.FileTooBig` translation covers both.
        return ctx.payloadTooLarge('FileTooBig');
      }

      try {
        await koaBody(bodyConfig)(ctx, async () => {});

        const files = getFiles(ctx);

        /**
         * in case the mime-type wasn't sent, Strapi tries to guess it
         * from the file extension, to avoid a corrupt database state
         */
        if (files) {
          if (Array.isArray(files)) {
            files.forEach(ensureFileMimeType);
          } else {
            ensureFileMimeType(files);
          }
        }

        await next();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message &&
          error.message.includes('maxFileSize') &&
          error.message.includes('exceeded')
        ) {
          return ctx.payloadTooLarge('FileTooBig');
        }

        throw error;
      }
    }

    const files = getFiles(ctx);

    // clean any file that was uploaded
    if (files) {
      if (Array.isArray(files)) {
        // not awaiting to not slow the request
        Promise.all(files.map((file) => fse.remove(file.filepath)));
      } else if (files && files.filepath) {
        // not awaiting to not slow the request
        fse.remove(files.filepath);
      }
      delete ctx.request.files;
    }
  };
};

export { bodyMiddleware as body };
