import { errors } from '@strapi/utils';

import registerSizeLimitMiddleware, { shouldRejectOversizedUpload } from '../size-limit';

const { PayloadTooLargeError } = errors;

const SIZE_LIMIT = 1000; // bytes — small enough to keep the fixtures readable
const ENVELOPE_MARGIN = 1024 * 1024;
const THRESHOLD = SIZE_LIMIT + ENVELOPE_MARGIN;

const createStrapi = (uploadConfig: Record<string, unknown> | undefined = {}) =>
  ({
    config: {
      get: jest.fn((key: string) => (key === 'plugin::upload' ? uploadConfig : undefined)),
    },
  }) as any;

type CtxOverrides = {
  method?: string;
  path?: string;
  contentType?: string | null;
  contentLength?: string | null;
};

const createCtx = ({
  method = 'POST',
  path = '/upload/files',
  contentType = 'multipart/form-data; boundary=----abc',
  contentLength = null,
}: CtxOverrides = {}) => {
  const headers: Record<string, string> = {};

  if (contentType !== null) {
    headers['content-type'] = contentType;
  }
  if (contentLength !== null) {
    headers['content-length'] = contentLength;
  }

  return {
    method,
    path,
    headers,
    get: (name: string) => headers[name.toLowerCase()] ?? '',
    is: (type: string) => (headers['content-type']?.includes(type) ? type : false),
    set: jest.fn(),
  } as any;
};

describe('Upload size-limit fast path', () => {
  describe('shouldRejectOversizedUpload', () => {
    test('rejects a single-file upload whose Content-Length exceeds sizeLimit', () => {
      const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });

      expect(shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))).toEqual({
        sizeLimit: SIZE_LIMIT,
      });
    });

    test('allows a request at the threshold', () => {
      const ctx = createCtx({ contentLength: String(THRESHOLD) });

      expect(
        shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
      ).toBeUndefined();
    });

    test('allows a request under the limit', () => {
      const ctx = createCtx({ contentLength: String(SIZE_LIMIT - 1) });

      expect(
        shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
      ).toBeUndefined();
    });

    test('allows a request with no Content-Length', () => {
      const ctx = createCtx({ contentLength: null });

      expect(
        shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
      ).toBeUndefined();
    });

    test.each([
      ['non-numeric', 'not-a-number'],
      ['negative', '-1'],
      ['exponent notation', '1e12'],
      ['hexadecimal', '0xffffffff'],
      ['whitespace-padded', ' 999999999 '],
      ['beyond Number.MAX_SAFE_INTEGER', '9007199254740993000'],
    ])('ignores a %s Content-Length and lets the exact check decide', (_label, contentLength) => {
      const ctx = createCtx({ contentLength });

      expect(
        shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
      ).toBeUndefined();
    });

    test('still rejects values above the signed-32-bit range', () => {
      const ctx = createCtx({ contentLength: String(3 * 1024 * 1024 * 1024) });

      expect(shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))).toEqual({
        sizeLimit: SIZE_LIMIT,
      });
    });

    describe('scope', () => {
      test.each([
        // sizeLimit is per-file but Content-Length covers the whole request, so
        // multi-file endpoints must keep relying on the exact post-parse check:
        // two 750 MB files are valid under a 1 GB per-file limit.
        ['legacy admin POST /upload', '/upload'],
        ['content API POST /api/upload', '/api/upload'],
        // Out of scope here: the replace flow has no `checkFileSize` backstop at
        // all, so there is nothing here to fast-path towards.
        ['replace', '/upload/files/1/replace'],
        ['an unrelated route', '/content-manager/single-types/api::home.home'],
      ])('does not guard %s', (_label, path) => {
        const ctx = createCtx({ path, contentLength: String(THRESHOLD + 1) });

        expect(
          shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
        ).toBeUndefined();
      });

      test('does not guard non-POST methods on the upload path', () => {
        const ctx = createCtx({ method: 'GET', contentLength: String(THRESHOLD + 1) });

        expect(
          shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
        ).toBeUndefined();
      });

      test('does not guard non-multipart requests', () => {
        const ctx = createCtx({
          contentType: 'application/json',
          contentLength: String(THRESHOLD + 1),
        });

        expect(
          shouldRejectOversizedUpload(ctx, createStrapi({ sizeLimit: SIZE_LIMIT }))
        ).toBeUndefined();
      });
    });

    describe('limit resolution', () => {
      test('does nothing when no sizeLimit is configured', () => {
        const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });

        expect(shouldRejectOversizedUpload(ctx, createStrapi({}))).toBeUndefined();
      });

      test('tolerates a missing plugin::upload config', () => {
        const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });

        expect(shouldRejectOversizedUpload(ctx, createStrapi(undefined))).toBeUndefined();
      });

      test('prefers the deprecated providerOptions.sizeLimit, matching the local provider', () => {
        // The local provider's `checkFileSize` gives providerOptions.sizeLimit
        // precedence; the fast path has to agree or it would reject files the
        // authoritative check accepts.
        const strapi = createStrapi({
          sizeLimit: 10 * 1024 * 1024,
          providerOptions: { sizeLimit: SIZE_LIMIT },
        });

        const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });
        expect(shouldRejectOversizedUpload(ctx, strapi)).toEqual({ sizeLimit: SIZE_LIMIT });

        // Under the deprecated limit's threshold but well under the plugin one.
        const allowed = createCtx({ contentLength: String(THRESHOLD) });
        expect(shouldRejectOversizedUpload(allowed, strapi)).toBeUndefined();
      });

      test('reads the limit per request, not once at register time', () => {
        const uploadConfig: Record<string, unknown> = { sizeLimit: 100 * 1024 * 1024 };
        const strapi = createStrapi(uploadConfig);
        const ctx = () => createCtx({ contentLength: String(THRESHOLD + 1) });

        expect(shouldRejectOversizedUpload(ctx(), strapi)).toBeUndefined();

        uploadConfig.sizeLimit = SIZE_LIMIT;

        expect(shouldRejectOversizedUpload(ctx(), strapi)).toEqual({ sizeLimit: SIZE_LIMIT });
      });
    });
  });

  describe('middleware registration', () => {
    const setup = (uploadConfig: Record<string, unknown> = { sizeLimit: SIZE_LIMIT }) => {
      const innerHandler = jest.fn(async (_ctx: any, next: any) => next());
      const bodyMiddleware = jest.fn(() => innerHandler);
      const extend = jest.fn();

      const strapi = {
        ...createStrapi(uploadConfig),
        get: jest.fn().mockReturnValue({ extend }),
      } as any;

      registerSizeLimitMiddleware({ strapi });

      expect(extend).toHaveBeenCalledWith('strapi::body', expect.any(Function));

      const [, extendFn] = extend.mock.calls[0];
      const handler = extendFn(bodyMiddleware)({}, { strapi });

      return { handler, bodyMiddleware, innerHandler };
    };

    test('extends strapi::body rather than registering a standalone middleware', () => {
      // Placement matters: a route middleware runs after the body has already
      // been consumed, and a global `server.use()` would land before
      // strapi::errors and lose the standard error formatting.
      setup();
    });

    test('opts out when the wrapped factory returns no handler', () => {
      // A middleware factory may legitimately return nothing. There is then no
      // body parsing to get ahead of, so the wrapper stands down too rather than
      // inserting a handler where the original contributed none.
      const extend = jest.fn();
      const strapi = {
        ...createStrapi({ sizeLimit: SIZE_LIMIT }),
        get: jest.fn().mockReturnValue({ extend }),
      } as any;

      registerSizeLimitMiddleware({ strapi });

      const [, extendFn] = extend.mock.calls[0];

      expect(extendFn(() => undefined)({}, { strapi })).toBeUndefined();
    });

    test('throws PayloadTooLargeError without invoking the body parser', async () => {
      const { handler, innerHandler } = setup();
      const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });
      const next = jest.fn();

      await expect(handler(ctx, next)).rejects.toThrow(PayloadTooLargeError);
      // The whole point: the body is never streamed to temp disk.
      expect(innerHandler).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('names the plugin limit in the error message', async () => {
      const { handler } = setup({ sizeLimit: 1_000_000 });
      const ctx = createCtx({ contentLength: String(1_000_000 + ENVELOPE_MARGIN + 1) });

      await expect(handler(ctx, jest.fn())).rejects.toThrow('The file exceeds size limit of 1 MB.');
    });

    test('does not force the connection closed', async () => {
      // Forcing teardown makes a fast sender hit EPIPE before the 413 body
      // flushes, losing the error message, and doesn't stop the send any sooner.
      const { handler } = setup();
      const ctx = createCtx({ contentLength: String(THRESHOLD + 1) });

      await expect(handler(ctx, jest.fn())).rejects.toThrow(PayloadTooLargeError);
      expect(ctx.set).not.toHaveBeenCalledWith('Connection', 'close');
    });

    test('delegates to the wrapped body middleware otherwise', async () => {
      const { handler, innerHandler } = setup();
      const ctx = createCtx({ contentLength: String(SIZE_LIMIT) });
      const next = jest.fn();

      await handler(ctx, next);

      expect(innerHandler).toHaveBeenCalledWith(ctx, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
