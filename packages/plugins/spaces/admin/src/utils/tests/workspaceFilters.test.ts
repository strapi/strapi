import {
  isWorkspaceFilterKey,
  purgePersistedWorkspaceFilters,
  stripWorkspaceFilters,
} from '../workspaceFilters';

describe('isWorkspaceFilterKey', () => {
  it('matches the workspace clauses the admin serialises', () => {
    expect(isWorkspaceFilterKey('filters[$and][0][space][slug][$eq]')).toBe(true);
    expect(isWorkspaceFilterKey('filters[$and][2][space][slug][$null]')).toBe(true);
    expect(isWorkspaceFilterKey('filters[space][slug][$eq]')).toBe(true);
  });

  it('leaves the other filters alone', () => {
    expect(isWorkspaceFilterKey('filters[$and][0][title][$eq]')).toBe(false);
    expect(isWorkspaceFilterKey('filters[$and][0][spaceship][$eq]')).toBe(false);
    expect(isWorkspaceFilterKey('sort')).toBe(false);
  });
});

describe('stripWorkspaceFilters', () => {
  it('returns null when there is nothing to remove', () => {
    expect(stripWorkspaceFilters('?page=1&sort=title:ASC')).toBeNull();
    expect(stripWorkspaceFilters('')).toBeNull();
  });

  it('removes the workspace clause and keeps every other parameter', () => {
    const result = stripWorkspaceFilters(
      '?page=1&filters[$and][0][space][slug][$eq]=acme&filters[$and][1][title][$eq]=hi'
    );

    expect(result).toContain('page=1');
    expect(result).toContain('title');
    expect(result).not.toContain('space');
  });

  it('returns an empty search when the workspace filter was the only parameter', () => {
    expect(stripWorkspaceFilters('?filters[$and][0][space][slug][$eq]=acme')).toBe('');
  });
});

describe('purgePersistedWorkspaceFilters', () => {
  const makeStorage = (entries: Record<string, string>) => {
    const store: Record<string, string> = { ...entries };
    return Object.assign(store, {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  };

  it('drops the workspace clause from the persisted list settings', () => {
    const storage = makeStorage({
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article': JSON.stringify({
        sort: 'title:ASC',
        filters: { $and: [{ space: { slug: { $eq: 'acme' } } }, { title: { $eq: 'hi' } }] },
      }),
    });

    purgePersistedWorkspaceFilters(storage);

    const stored = JSON.parse(storage['STRAPI_LIST_VIEW_SETTINGS:api::article.article']);
    expect(stored.filters.$and).toEqual([{ title: { $eq: 'hi' } }]);
    expect(stored.sort).toBe('title:ASC');
  });

  it('removes the filters key entirely when only the workspace clause was there', () => {
    const storage = makeStorage({
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article': JSON.stringify({
        filters: { $and: [{ space: { slug: { $eq: 'acme' } } }] },
        pageSize: '10',
      }),
    });

    purgePersistedWorkspaceFilters(storage);

    const stored = JSON.parse(storage['STRAPI_LIST_VIEW_SETTINGS:api::article.article']);
    expect(stored.filters).toBeUndefined();
    expect(stored.pageSize).toBe('10');
  });

  it('leaves unrelated keys and malformed entries untouched', () => {
    const storage = makeStorage({
      STRAPI_LOCALE: '"en"',
      'STRAPI_LIST_VIEW_SETTINGS:api::broken.broken': 'not json',
      'STRAPI_LIST_VIEW_SETTINGS:api::other.other': JSON.stringify({
        filters: { $and: [{ title: { $eq: 'hi' } }] },
      }),
    });

    expect(() => purgePersistedWorkspaceFilters(storage)).not.toThrow();
    expect(storage.STRAPI_LOCALE).toBe('"en"');
    expect(storage['STRAPI_LIST_VIEW_SETTINGS:api::broken.broken']).toBe('not json');
    expect(
      JSON.parse(storage['STRAPI_LIST_VIEW_SETTINGS:api::other.other']).filters.$and
    ).toHaveLength(1);
  });
});
