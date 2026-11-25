import { describe, expect, it, vi } from 'vitest';

import { createArmQueriesMiddleware, isQueryOnlyBody } from '../abort-queries';

describe('isQueryOnlyBody', () => {
  it.each([
    ['a query', { query: '{ articles { title } }' }],
    ['a named query', { query: 'query Articles { articles { title } }' }],
    ['a query by shorthand with variables', { query: '{ a }', variables: { a: 1 } }],
    [
      'the selected query of a document with several operations',
      {
        query: 'query A { a } mutation B { b }',
        operationName: 'A',
      },
    ],
  ])('is true for %s', (_label, body) => {
    expect(isQueryOnlyBody(body)).toBe(true);
  });

  it.each([
    ['a mutation', { query: 'mutation { createArticle(data: {}) { documentId } }' }],
    ['a subscription', { query: 'subscription { changed }' }],
    [
      'the selected mutation of a document with several operations',
      { query: 'query A { a } mutation B { b }', operationName: 'B' },
    ],
    ['several operations and no operationName', { query: 'query A { a } query B { b }' }],
    ['an operationName that matches nothing', { query: 'query A { a }', operationName: 'Z' }],
    [
      'a persisted query without query text',
      { extensions: { persistedQuery: { sha256Hash: 'x' } } },
    ],
    ['a query that does not parse', { query: '{ articles ' }],
    ['a query that is not a string', { query: 42 }],
    ['no body', undefined],
    ['a string body', 'query { a }'],
    ['a fragment only document', { query: 'fragment F on Article { title }' }],
  ])('is false for %s', (_label, body) => {
    expect(isQueryOnlyBody(body)).toBe(false);
  });

  it('is true for a batch where every operation is a query', () => {
    expect(isQueryOnlyBody([{ query: '{ a }' }, { query: 'query B { b }' }])).toBe(true);
  });

  it('is false for a batch with a mutation, an unparsable entry, or no entry', () => {
    expect(isQueryOnlyBody([{ query: '{ a }' }, { query: 'mutation { b }' }])).toBe(false);
    expect(isQueryOnlyBody([{ query: '{ a }' }, { query: '{ b ' }])).toBe(false);
    expect(isQueryOnlyBody([{ query: '{ a }' }, {}])).toBe(false);
    expect(isQueryOnlyBody([])).toBe(false);
  });
});

describe('createArmQueriesMiddleware', () => {
  const setup = (method: string, body: unknown, settingOn = true) => {
    const armClientAbortSignal = vi.fn((_ctx: unknown, run: () => unknown) => run());
    const strapi = {
      server: { armClientAbortSignal },
      db: { config: { settings: { abortReadsOnRequestDisconnect: settingOn } } },
    } as any;
    const ctx = { method, request: { body } } as any;
    const next = vi.fn(async () => undefined);

    return { middleware: createArmQueriesMiddleware(strapi), ctx, next, armClientAbortSignal };
  };

  it('runs a POST query under the client abort signal', async () => {
    const { middleware, ctx, next, armClientAbortSignal } = setup('POST', { query: '{ a }' });

    await middleware(ctx, next);

    expect(armClientAbortSignal).toHaveBeenCalledWith(ctx, expect.any(Function));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not arm a POST mutation', async () => {
    const { middleware, ctx, next, armClientAbortSignal } = setup('POST', {
      query: 'mutation { a }',
    });

    await middleware(ctx, next);

    expect(armClientAbortSignal).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not parse or arm anything when the setting is off', async () => {
    const { middleware, ctx, next, armClientAbortSignal } = setup(
      'POST',
      { query: '{ a }' },
      false
    );

    await middleware(ctx, next);

    expect(armClientAbortSignal).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not arm again for GET and HEAD, the server did already', async () => {
    for (const method of ['GET', 'HEAD']) {
      const { middleware, ctx, next, armClientAbortSignal } = setup(method, undefined);

      await middleware(ctx, next);

      expect(armClientAbortSignal).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  it.each(['PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    'does not arm a %s request, even with a query body',
    async (method) => {
      const { middleware, ctx, next, armClientAbortSignal } = setup(method, { query: '{ a }' });

      await middleware(ctx, next);

      expect(armClientAbortSignal).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    }
  );

  it('just continues when the server cannot arm a signal', async () => {
    const next = vi.fn(async () => undefined);
    const middleware = createArmQueriesMiddleware({
      server: {},
      db: { config: { settings: { abortReadsOnRequestDisconnect: true } } },
    } as any);

    await middleware({ method: 'POST', request: { body: { query: '{ a }' } } } as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
