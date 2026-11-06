import { describe, expect, it, vi } from 'vitest';

import {
  nestedScopeOf,
  readsAttribute,
  respondToWrite,
  sanitizeEntries,
  sanitizeNested,
} from '../nested-output';

const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
    seo: { type: 'component', component: 'shared.seo' },
    blocks: { type: 'dynamiczone', components: ['shared.card'] },
    cover: { type: 'media' },
  },
} as any;

const seo = {
  uid: 'shared.seo',
  modelType: 'component',
  attributes: { metaTitle: { type: 'string' }, image: { type: 'media' } },
} as any;

/**
 * A `sanitize.output` that applies the rules `hidden` names: top-level keys of the root entry
 * (`tags`), and keys of the rows of a component or zone (`seo.metaDescription`), found by walking
 * the data as the real traversal does
 */
const makeStrapi = (hidden: string[] = []) => {
  const hide = (node: any, prefix: string): any => {
    if (Array.isArray(node)) {
      return node.map((item) => hide(item, prefix));
    }

    if (node === null || typeof node !== 'object') {
      return node;
    }

    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !hidden.includes(prefix === '' ? key : `${prefix}.${key}`))
        .map(([key, value]) => [key, hide(value, prefix === '' ? key : `${prefix}.${key}`)])
    );
  };

  const output = vi.fn<(...args: any[]) => Promise<any>>(async (data) => hide(data, ''));

  return {
    strapi: {
      contentAPI: { sanitize: { output } },
      localization: {
        isLocalizedContentType: vi.fn(() => false),
        getDefaultLocale: vi.fn(async () => 'en'),
      },
    } as any,
    output,
  };
};

const ctx = (): any => ({ state: { auth: { id: 1 } } });

describe('sanitizeEntries', () => {
  it('offers the nested attributes to the rules as null markers, and takes them out again', async () => {
    const { strapi, output } = makeStrapi();
    const entry = { id: 1, documentId: 'a', publishedAt: null, title: 't' };

    const result = await sanitizeEntries(strapi, ctx(), article, [entry], { action: 'find' });

    expect(output).toHaveBeenCalledTimes(1);
    expect(output.mock.calls[0][0]).toEqual([
      { ...entry, tags: null, seo: null, blocks: null, cover: null },
    ]);
    expect(output.mock.calls[0][2]).toEqual({ auth: { id: 1 }, action: 'find' });
    expect(result).toEqual([entry]);
  });

  it('leaves out of its answer a field the rules hide, and remembers which the caller may read', async () => {
    const { strapi, output } = makeStrapi(['tags', 'blocks']);
    const context = ctx();
    const [entry] = (await sanitizeEntries(strapi, context, article, [{ documentId: 'a' }], {
      action: 'find',
    })) as any[];

    const scope = (await nestedScopeOf(strapi, context, entry, article))!;

    expect(await readsAttribute(strapi, context, scope, article, 'seo')).toBe(true);
    expect(await readsAttribute(strapi, context, scope, article, 'cover')).toBe(true);
    expect(await readsAttribute(strapi, context, scope, article, 'tags')).toBe(false);
    expect(await readsAttribute(strapi, context, scope, article, 'blocks')).toBe(false);
    // Known from the one call that sanitized the entry
    expect(output).toHaveBeenCalledTimes(1);
  });

  it('keeps an attribute of the entry that is there (a custom resolver populated it) as it was', async () => {
    const { strapi } = makeStrapi();
    const entry = { documentId: 'a', tags: [{ documentId: 't' }] };

    expect(await sanitizeEntries(strapi, ctx(), article, entry, { action: 'findOne' })).toEqual(
      entry
    );
  });
});

describe('nestedScopeOf', () => {
  it('gives an entry a resolver output the scope it was output in', async () => {
    const { strapi } = makeStrapi();
    const context = ctx();
    const entry = (await sanitizeEntries(
      strapi,
      context,
      article,
      { documentId: 'a' },
      {
        action: 'update',
        status: 'draft',
      }
    )) as any;

    expect(await nestedScopeOf(strapi, context, entry, article)).toMatchObject({
      action: 'update',
      status: 'draft',
      identity: { documentId: 'a' },
      steps: [],
    });
  });

  it('reads an entry no resolver output as a root entry read by find', async () => {
    const { strapi } = makeStrapi();
    const parent = { id: 3, documentId: 'x', publishedAt: null };

    expect(await nestedScopeOf(strapi, ctx(), parent, article)).toMatchObject({
      action: 'find',
      identity: { id: 3, documentId: 'x', publishedAt: null },
    });
  });

  it('has no scope for a component row nobody output, or for no entry', async () => {
    const { strapi } = makeStrapi();

    expect(await nestedScopeOf(strapi, ctx(), { metaTitle: 'x' }, seo)).toBeNull();
    expect(await nestedScopeOf(strapi, ctx(), null, article)).toBeNull();
  });
});

describe('readsAttribute for an entry no resolver output', () => {
  it('asks the rules once for all its nested attributes, in the root entry the rules are those of', async () => {
    const { strapi, output } = makeStrapi(['cover']);
    const context = ctx();
    const parent = { id: 3, documentId: 'x', publishedAt: null };
    const scope = (await nestedScopeOf(strapi, context, parent, article))!;

    expect(await readsAttribute(strapi, context, scope, article, 'tags')).toBe(true);
    expect(await readsAttribute(strapi, context, scope, article, 'cover')).toBe(false);
    expect(output).toHaveBeenCalledTimes(1);
    expect(output.mock.calls[0][0]).toEqual({
      ...parent,
      tags: null,
      seo: null,
      blocks: null,
      cover: null,
    });
    expect(output.mock.calls[0][1]).toBe(article);
  });
});

describe('an entry no resolver output is not known to have matched the read filter', () => {
  it('has an unfiltered scope, which the entry is judged by when its fields and its rows are', async () => {
    const { strapi, output } = makeStrapi();
    const context = ctx();
    const parent = { id: 3, documentId: 'x', publishedAt: null };
    const scope = (await nestedScopeOf(strapi, context, parent, article))!;

    expect(scope.unfiltered).toBe(true);

    await readsAttribute(strapi, context, scope, article, 'seo');
    await sanitizeNested(strapi, context, scope, 'seo', [{ id: 1 }]);

    expect(output.mock.calls.map((call) => call[2])).toEqual([
      { auth: { id: 1 }, action: 'find', unfiltered: true },
      { auth: { id: 1 }, action: 'find', unfiltered: true },
    ]);
  });

  it('keeps it for what is nested in the rows', async () => {
    const { strapi, output } = makeStrapi();
    const context = ctx();
    const scope = (await nestedScopeOf(strapi, context, { id: 3, documentId: 'x' }, article))!;

    const [row] = (await sanitizeNested(strapi, context, scope, 'seo', [{ id: 1 }])) as any[];
    const rowScope = (await nestedScopeOf(strapi, context, row, seo))!;

    expect(rowScope.unfiltered).toBe(true);

    output.mockClear();
    await readsAttribute(strapi, context, rowScope, seo, 'image');

    expect(output.mock.calls[0][2]).toMatchObject({ unfiltered: true });
  });

  it('is judged with no documentId when it has none, so only the always-readable fields can be granted', async () => {
    const { strapi, output } = makeStrapi();
    const context = ctx();
    const scope = (await nestedScopeOf(strapi, context, { id: 3 }, article))!;

    await readsAttribute(strapi, context, scope, article, 'tags');

    expect(output.mock.calls[0][0]).not.toHaveProperty('documentId');
    expect(output.mock.calls[0][2]).toMatchObject({ unfiltered: true });
  });

  it('is not said of an entry a resolver output through the read filter', async () => {
    const { strapi, output } = makeStrapi();
    const context = ctx();
    const entry = (await sanitizeEntries(
      strapi,
      context,
      article,
      { documentId: 'a' },
      {
        action: 'find',
      }
    )) as any;
    const scope = (await nestedScopeOf(strapi, context, entry, article))!;

    expect(scope.unfiltered).toBeUndefined();

    await sanitizeNested(strapi, context, scope, 'seo', [{ id: 1 }]);

    expect(output.mock.calls.at(-1)![2]).toEqual({ auth: { id: 1 }, action: 'find' });
  });
});

describe('sanitizeNested', () => {
  const rootScope = async (strapi: any, context: any) =>
    (await nestedScopeOf(strapi, context, { id: 3, documentId: 'x' }, article))!;

  it('sanitizes the rows of a component by the rules of the entry they belong to', async () => {
    const { strapi, output } = makeStrapi(['seo.metaDescription']);
    const context = ctx();
    const scope = await rootScope(strapi, context);

    const rows = await sanitizeNested(strapi, context, scope, 'seo', [
      { id: 1, metaTitle: 'a', metaDescription: 'b' },
    ]);

    expect(output.mock.calls[0][0]).toEqual({
      id: 3,
      documentId: 'x',
      seo: [{ id: 1, metaTitle: 'a', metaDescription: 'b' }],
    });
    expect(output.mock.calls[0][1]).toBe(article);
    expect(rows).toEqual([{ id: 1, metaTitle: 'a' }]);
  });

  it('answers null for rows the rules removed, and leaves null and undefined alone', async () => {
    const { strapi } = makeStrapi(['seo']);
    const context = ctx();
    const scope = await rootScope(strapi, context);

    expect(await sanitizeNested(strapi, context, scope, 'seo', [{ id: 1 }])).toBeNull();
    expect(await sanitizeNested(strapi, context, scope, 'blocks', null)).toBeNull();
    expect(await sanitizeNested(strapi, context, scope, 'blocks', undefined)).toBeUndefined();
  });

  it('gives each row a scope, so what is nested in it is judged by the same rules, by its path', async () => {
    const { strapi, output } = makeStrapi(['seo.image']);
    const context = ctx();
    const scope = await rootScope(strapi, context);

    const [row] = (await sanitizeNested(strapi, context, scope, 'seo', [{ id: 1 }])) as any[];
    const rowScope = (await nestedScopeOf(strapi, context, row, seo))!;

    expect(rowScope.steps).toEqual([{ attribute: 'seo' }]);

    output.mockClear();

    expect(await readsAttribute(strapi, context, rowScope, seo, 'image')).toBe(false);
    expect(output.mock.calls[0][0]).toEqual({
      id: 3,
      documentId: 'x',
      seo: [{ image: null }],
    });
  });

  it('names the component of a dynamic zone row on the way down', async () => {
    const { strapi, output } = makeStrapi();
    const context = ctx();
    const scope = await rootScope(strapi, context);
    const card = {
      uid: 'shared.card',
      modelType: 'component',
      attributes: { icon: { type: 'media' } },
    } as any;

    const [row] = (await sanitizeNested(strapi, context, scope, 'blocks', [
      { id: 7, __component: 'shared.card' },
    ])) as any[];
    const rowScope = (await nestedScopeOf(strapi, context, row, card))!;

    expect(rowScope.steps).toEqual([{ attribute: 'blocks', component: 'shared.card' }]);

    output.mockClear();
    await readsAttribute(strapi, context, rowScope, card, 'icon');

    expect(output.mock.calls[0][0]).toEqual({
      id: 3,
      documentId: 'x',
      blocks: [{ __component: 'shared.card', icon: null }],
    });
  });
});

describe('respondToWrite', () => {
  it('sanitizes by the write action with the version and locale, and remembers the version', async () => {
    const { strapi, output } = makeStrapi();
    const context: any = ctx();
    const entity = { documentId: 'd', publishedAt: null };

    await respondToWrite(strapi, article, 'update', entity, {
      status: 'draft',
      locale: 'fr',
      context,
      info: { path: { key: 'u' } },
    });

    expect(output.mock.calls[0][2]).toEqual({
      auth: { id: 1 },
      action: 'update',
      status: 'draft',
      locale: 'fr',
    });
    expect(context.writeScopeByPath.get('u')).toEqual({ status: 'draft' });
  });

  it('answers null as null', async () => {
    const { strapi, output } = makeStrapi();

    expect(
      await respondToWrite(strapi, article, 'create', null, {
        status: undefined,
        locale: undefined,
        context: ctx(),
        info: undefined,
      })
    ).toBeNull();
    expect(output).not.toHaveBeenCalled();
  });
});
