import { normalizeContentType, buildApiModules, CUSTOM_API_NAME } from '../normalize';
import * as is from '../attributes';
import { routeVerbs } from '../routes';
import type { AppContentType } from '../types';

const article: AppContentType = {
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  attributes: { title: is.string({ required: true }) },
};

describe('normalizeContentType', () => {
  it('builds a schema mirroring the file-based loader', () => {
    const { apiName, key, autoCrud, definition } = normalizeContentType(article);

    expect(apiName).toBe('article');
    expect(key).toBe('article');
    expect(autoCrud).toBe(true);
    expect(definition.schema).toMatchObject({
      kind: 'collectionType',
      collectionName: 'article',
      apiName: 'article',
      globalId: 'Article',
      info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
      attributes: { title: { type: 'string', required: true } },
    });
  });

  it('defaults apiName to singularName and allows overriding it', () => {
    expect(normalizeContentType(article).apiName).toBe('article');
    expect(normalizeContentType({ ...article, apiName: 'content' }).apiName).toBe('content');
  });

  it('respects an explicit collectionName and kind', () => {
    const { definition } = normalizeContentType({
      ...article,
      collectionName: 'my_articles',
      kind: 'singleType',
    });
    expect(definition.schema.collectionName).toBe('my_articles');
    expect(definition.schema.kind).toBe('singleType');
  });

  it('marks api: false content types as no-auto-crud', () => {
    expect(normalizeContentType({ ...article, api: false }).autoCrud).toBe(false);
  });

  it('tags the schema with a programmatic origin (for CTB read-only)', () => {
    const { definition } = normalizeContentType(article);
    expect(definition.schema.pluginOptions).toMatchObject({
      'content-type-builder': { origin: 'programmatic' },
    });
  });

  it('preserves existing content-type-builder pluginOptions alongside the origin tag', () => {
    const { definition } = normalizeContentType({
      ...article,
      pluginOptions: { 'content-type-builder': { visible: false } },
    });
    expect(definition.schema.pluginOptions).toMatchObject({
      'content-type-builder': { visible: false, origin: 'programmatic' },
    });
  });

  it.each([
    [{ ...article, singularName: undefined }, /singularName/],
    [{ ...article, pluralName: undefined }, /pluralName/],
    [{ ...article, displayName: undefined }, /displayName/],
    [{ ...article, singularName: 'Article' }, /kebab-case/],
    [{ ...article, pluralName: 'Articles' }, /kebab-case/],
  ])('throws a clear error for invalid input %#', (input, matcher) => {
    expect(() => normalizeContentType(input as AppContentType)).toThrow(matcher);
  });
});

describe('buildApiModules', () => {
  it('creates one module per apiName with auto-CRUD wiring', () => {
    const modules = buildApiModules([article]);

    expect(Object.keys(modules)).toEqual(['article']);
    const mod = modules.article;
    expect(mod.contentTypes.article).toBeDefined();
    expect(typeof mod.controllers.article).toBe('function');
    expect(typeof mod.services.article).toBe('function');
    expect(mod.routes.article).toBeDefined();
  });

  it('groups multiple content types under a shared apiName', () => {
    const modules = buildApiModules([
      { ...article, apiName: 'content' },
      {
        singularName: 'tag',
        pluralName: 'tags',
        displayName: 'Tag',
        apiName: 'content',
        attributes: {},
      },
    ]);

    expect(Object.keys(modules)).toEqual(['content']);
    expect(Object.keys(modules.content.contentTypes).sort()).toEqual(['article', 'tag']);
  });

  it('omits auto-CRUD when api: false', () => {
    const modules = buildApiModules([{ ...article, api: false }]);
    expect(modules.article.controllers).toEqual({});
    expect(modules.article.routes).toEqual({});
  });

  it('attaches custom routes to the synthetic application API', () => {
    const modules = buildApiModules([], [routeVerbs.post('/echo', () => ({}))]);

    expect(Object.keys(modules)).toEqual([CUSTOM_API_NAME]);
    const router = modules[CUSTOM_API_NAME].routes.custom as { type: string; routes: unknown[] };
    expect(router.type).toBe('content-api');
    expect(router.routes).toHaveLength(1);
  });

  it('throws on a duplicate content type within one API', () => {
    expect(() => buildApiModules([article, article])).toThrow(/Duplicate/);
  });
});
