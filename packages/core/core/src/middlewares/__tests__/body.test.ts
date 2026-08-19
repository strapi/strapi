import { koaBody } from 'koa-body';

import { body } from '../body';

// `jest.mock` is hoisted above the imports by the transform, so koa-body is
// already mocked by the time the module under test pulls it in. Stubbing it is
// what lets the tests assert the body was never parsed.
jest.mock('koa-body', () => ({
  koaBody: jest.fn(() => async () => {}),
}));

const koaBodyMock = koaBody as jest.MockedFunction<typeof koaBody>;

const createStrapi = () =>
  ({
    plugin: jest.fn().mockReturnValue(undefined),
  }) as any;

type CtxOverrides = {
  method?: string;
  contentType?: string | null;
  contentLength?: string | null;
};

const createCtx = ({
  method = 'POST',
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
    url: '/upload',
    headers,
    request: {},
    get: (name: string) => headers[name.toLowerCase()] ?? '',
    // Only ever asked about 'multipart' by the code under test.
    is: (type: string) => (headers['content-type']?.includes(type) ? type : false),
    set: jest.fn(),
    payloadTooLarge: jest.fn(),
  } as any;
};

/** 200 MiB file + 20 MiB fields + 1 MiB envelope margin — the stock threshold. */
const DEFAULT_THRESHOLD = 200 * 1024 * 1024 + 20 * 1024 * 1024 + 1024 * 1024;

const run = async (ctx: any, config: any = {}) => {
  const next = jest.fn();
  await body(config, { strapi: createStrapi() } as any)(ctx, next);
  return next;
};

describe('Body middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    koaBodyMock.mockImplementation(() => (async () => {}) as any);
  });

  describe('Content-Length fast path', () => {
    test('rejects a multipart request whose Content-Length exceeds the limits, without parsing the body', async () => {
      const ctx = createCtx({ contentLength: String(DEFAULT_THRESHOLD + 1) });

      const next = await run(ctx);

      expect(ctx.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');
      // The whole point: the body is never read.
      expect(koaBodyMock).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('does not force the connection closed', async () => {
      // `Connection: close` makes a fast sender hit EPIPE before the 413 body
      // flushes, which costs the client the translatable error message — and it
      // doesn't make the upload stop any earlier. Not reading the body is what
      // stalls the sender.
      const ctx = createCtx({ contentLength: String(DEFAULT_THRESHOLD + 1) });

      await run(ctx);

      expect(ctx.set).not.toHaveBeenCalledWith('Connection', 'close');
      expect(ctx.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');
    });

    test('passes through a request exactly at the threshold', async () => {
      const ctx = createCtx({ contentLength: String(DEFAULT_THRESHOLD) });

      const next = await run(ctx);

      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
      expect(koaBodyMock).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    test('passes through when Content-Length is absent (chunked bodies)', async () => {
      const ctx = createCtx({ contentLength: null });

      await run(ctx);

      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
      expect(koaBodyMock).toHaveBeenCalled();
    });

    test('honours a configured formidable maxFileSize', async () => {
      const config = { formidable: { maxFileSize: 1024, maxFieldsSize: 0 } };
      const threshold = 1024 + 1024 * 1024;

      const rejected = createCtx({ contentLength: String(threshold + 1) });
      await run(rejected, config);
      expect(rejected.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');

      const allowed = createCtx({ contentLength: String(threshold) });
      await run(allowed, config);
      expect(allowed.payloadTooLarge).not.toHaveBeenCalled();
    });

    test('leaves room for field data up to maxFieldsSize', async () => {
      // A request that is over maxFileSize alone but within the fields allowance
      // is something formidable would accept, so the fast path must not reject it.
      const config = { formidable: { maxFileSize: 1024, maxFieldsSize: 10 * 1024 * 1024 } };
      const ctx = createCtx({ contentLength: String(1024 + 5 * 1024 * 1024) });

      await run(ctx, config);

      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
      expect(koaBodyMock).toHaveBeenCalled();
    });

    test('does not apply to non-multipart requests', async () => {
      const ctx = createCtx({
        contentType: 'application/json',
        contentLength: String(DEFAULT_THRESHOLD + 1),
      });

      await run(ctx);

      // jsonLimit/formLimit go through co-body, which already fast-fails on
      // Content-Length itself.
      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
      expect(koaBodyMock).toHaveBeenCalled();
    });

    test('does not apply when multipart parsing is disabled', async () => {
      const ctx = createCtx({ contentLength: String(DEFAULT_THRESHOLD + 1) });

      await run(ctx, { multipart: false });

      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
    });

    test('does not apply to methods outside parsedMethods', async () => {
      const ctx = createCtx({
        method: 'PUT',
        contentLength: String(DEFAULT_THRESHOLD + 1),
      });

      await run(ctx, { parsedMethods: ['POST'] });

      // koa-body wouldn't parse or enforce anything here, so neither do we.
      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
    });

    test('applies to any method in a custom parsedMethods list', async () => {
      const ctx = createCtx({
        method: 'patch',
        contentLength: String(DEFAULT_THRESHOLD + 1),
      });

      await run(ctx, { parsedMethods: ['POST', 'PATCH'] });

      expect(ctx.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');
    });

    test.each([
      ['a value above the 32-bit range', String(3 * 1024 * 1024 * 1024)],
      ['a value above 2 GiB', String(2 * 1024 * 1024 * 1024 + 1)],
    ])('still rejects %s (no signed-32-bit truncation)', async (_label, contentLength) => {
      const ctx = createCtx({ contentLength });

      await run(ctx);

      expect(ctx.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');
    });

    test.each([
      ['non-numeric', 'not-a-number'],
      ['negative', '-1'],
      ['exponent notation', '1e12'],
      ['hexadecimal', '0xffffffffff'],
      ['padded with whitespace', ` ${DEFAULT_THRESHOLD + 1} `],
      ['empty', ''],
      ['beyond Number.MAX_SAFE_INTEGER', '9007199254740993000'],
    ])('falls through to streaming enforcement for a %s Content-Length', async (_l, value) => {
      const ctx = createCtx({ contentLength: value });

      await run(ctx);

      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
      expect(koaBodyMock).toHaveBeenCalled();
    });
  });

  describe('post-parse enforcement (backstop)', () => {
    test('translates a formidable maxFileSize error into a 413 FileTooBig', async () => {
      koaBodyMock.mockImplementation(
        () =>
          (async () => {
            throw new Error(
              'options.maxFileSize (1024 bytes) exceeded, received 2048 bytes of file data'
            );
          }) as any
      );

      const ctx = createCtx({ contentLength: '2048' });
      const next = await run(ctx);

      expect(ctx.payloadTooLarge).toHaveBeenCalledWith('FileTooBig');
      expect(next).not.toHaveBeenCalled();
    });

    test('rethrows unrelated parse errors', async () => {
      koaBodyMock.mockImplementation(
        () =>
          (async () => {
            throw new Error('Unexpected end of form');
          }) as any
      );

      const ctx = createCtx({ contentLength: '2048' });

      await expect(run(ctx)).rejects.toThrow('Unexpected end of form');
      expect(ctx.payloadTooLarge).not.toHaveBeenCalled();
    });
  });
});
