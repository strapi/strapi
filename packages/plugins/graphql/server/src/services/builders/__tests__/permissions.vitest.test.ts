import { describe, expect, it, vi } from 'vitest';

import {
  createWriteGuard,
  getOutputScope,
  isSubjectAware,
  recordWriteScope,
  statusArg,
  stringArg,
} from '../permissions';

const note = { uid: 'api::note.note', modelType: 'contentType', kind: 'collectionType' } as any;
const article = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  options: { draftAndPublish: true },
} as any;

const makeStrapi = (overrides: Record<string, unknown> = {}) =>
  ({
    contentAPI: {
      permissions: {
        isSubjectAware: vi.fn(() => true),
        checker: { filtersFor: vi.fn(() => ({})) },
        publishIfAllowed: vi.fn(async () => false),
      },
      sanitize: { output: vi.fn(async (data) => data) },
    },
    localization: {
      isLocalizedContentType: vi.fn(() => false),
      getDefaultLocale: vi.fn(async () => 'en'),
    },
    documents: vi.fn(() => ({ count: vi.fn(async () => 0), findOne: vi.fn(async () => null) })),
    ...overrides,
  }) as any;

describe('stringArg and statusArg', () => {
  it('read null, an empty string and anything but a string as no value', () => {
    expect(stringArg(null)).toBeUndefined();
    expect(stringArg('')).toBeUndefined();
    expect(stringArg(3)).toBeUndefined();
    expect(stringArg('fr')).toBe('fr');
    expect(stringArg('*')).toBe('*');
  });

  it('keep draft and published only', () => {
    expect(statusArg('draft')).toBe('draft');
    expect(statusArg('published')).toBe('published');
    expect(statusArg(null)).toBeUndefined();
    expect(statusArg('DRAFT')).toBeUndefined();
  });
});

describe('isSubjectAware', () => {
  it('asks the permission utilities about the context auth', () => {
    const strapi = makeStrapi();
    const auth = { ability: {} };

    expect(isSubjectAware(strapi, { state: { auth } })).toBe(true);
    expect(strapi.contentAPI.permissions.isSubjectAware).toHaveBeenCalledWith(auth);
    expect(isSubjectAware(strapi, undefined)).toBe(true);
    expect(strapi.contentAPI.permissions.isSubjectAware).toHaveBeenLastCalledWith(undefined);
  });
});

describe('getOutputScope', () => {
  it('keeps a draft or published status and a locale as asked', async () => {
    const strapi = makeStrapi();

    expect(await getOutputScope(strapi, note, { status: 'draft', locale: 'fr' })).toEqual({
      status: 'draft',
      locale: 'fr',
    });
    expect(await getOutputScope(strapi, note, { status: 'DRAFT', locale: null })).toEqual({});
  });

  it('reads a localized type with no locale in the default locale', async () => {
    const strapi = makeStrapi();
    strapi.localization.isLocalizedContentType.mockReturnValue(true);

    expect(await getOutputScope(strapi, note, { status: 'published' })).toEqual({
      status: 'published',
      locale: 'en',
    });
    expect(await getOutputScope(strapi, note, { locale: '*' })).toEqual({ locale: '*' });
  });
});

describe('recordWriteScope', () => {
  it('remembers a draft & publish entity by its version, under the response key of the root field', () => {
    const context: any = {};

    recordWriteScope(context, { path: { key: 'created' } }, article, { publishedAt: null });
    recordWriteScope(context, { path: { key: 'other' } }, article, { publishedAt: '2026-01-01' });

    expect(context.writeScopeByPath.get('created')).toEqual({ status: 'draft' });
    expect(context.writeScopeByPath.get('other')).toEqual({ status: 'published' });
  });

  it('reads a type without draft & publish as published, and records nothing without a key', () => {
    const context: any = {};

    recordWriteScope(context, { path: { key: 'k' } }, note, { publishedAt: null });
    recordWriteScope(context, undefined, note, {});

    expect(context.writeScopeByPath.get('k')).toEqual({ status: 'published' });
    expect(context.writeScopeByPath.size).toBe(1);
  });
});

describe('createWriteGuard', () => {
  it('refuses a create when the create rows give no entry', () => {
    const strapi = makeStrapi();
    const guard = createWriteGuard(strapi, note);

    expect(() => guard.assertCanCreate({})).not.toThrow();

    strapi.contentAPI.permissions.checker.filtersFor.mockReturnValue(null);

    expect(() => guard.assertCanCreate({})).toThrow();
    expect(strapi.contentAPI.permissions.checker.filtersFor).toHaveBeenCalledWith(
      {},
      'create',
      'api::note.note'
    );
  });

  it('adds a locale only for a localized type whose document has no draft in it', async () => {
    const strapi = makeStrapi();
    const count = vi.fn(async () => 0);
    strapi.documents = vi.fn(() => ({ count }));
    const guard = createWriteGuard(strapi, article);

    expect(await guard.addsLocale('d1', 'fr')).toBe(false);
    expect(count).not.toHaveBeenCalled();

    strapi.localization.isLocalizedContentType.mockReturnValue(true);

    expect(await guard.addsLocale('d1', 'fr')).toBe(true);
    expect(count).toHaveBeenCalledWith({
      filters: { documentId: 'd1' },
      status: 'draft',
      locale: 'fr',
    });
    expect(await guard.addsLocale('d1', '*')).toBe(false);

    count.mockResolvedValue(1);

    expect(await guard.addsLocale('d1', undefined)).toBe(false);
  });

  it('publishes only on draft & publish with a resolved status of published', () => {
    const strapi = makeStrapi();

    expect(createWriteGuard(strapi, article).publishes({ status: 'published' })).toBe(true);
    expect(createWriteGuard(strapi, article).publishes({ status: 'draft' })).toBe(false);
    expect(createWriteGuard(strapi, note).publishes({ status: 'published' })).toBe(false);
  });

  it('answers the published version when the caller may publish the entry it created', async () => {
    const strapi = makeStrapi();
    const findOne = vi.fn(async () => ({ documentId: 'd1', publishedAt: 'now' }));
    strapi.documents = vi.fn(() => ({ findOne }));
    strapi.contentAPI.permissions.publishIfAllowed.mockResolvedValue(true);
    const guard = createWriteGuard(strapi, article);
    const draft = { documentId: 'd1', locale: 'fr', publishedAt: null };

    expect(await guard.publishCreated({}, draft, undefined)).toEqual({
      documentId: 'd1',
      publishedAt: 'now',
    });
    expect(strapi.contentAPI.permissions.publishIfAllowed).toHaveBeenCalledWith(
      {},
      'api::article.article',
      'd1',
      { locale: 'fr' }
    );
    expect(findOne).toHaveBeenCalledWith({ documentId: 'd1', status: 'published', locale: 'fr' });

    strapi.contentAPI.permissions.publishIfAllowed.mockResolvedValue(false);

    expect(await guard.publishCreated({}, draft, undefined)).toBe(draft);
  });
});
