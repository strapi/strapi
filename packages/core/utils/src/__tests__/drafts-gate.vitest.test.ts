import { beforeEach, describe, expect, it } from 'vitest';
import { cloneDeep } from 'lodash';

import {
  DENY_ALL_FILTER,
  deniesAll,
  type ExplainEntry,
  type PermissionChecker,
} from '../content-api-permissions';
import { PolicyError, ValidationError } from '../errors';
import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import { assertDraftAccess } from '../validate/drafts-gate';
import type { Model } from '../types';

const USER = 'plugin::end-users.user';
const ARTICLE = 'api::article.article';
const TAG = 'api::tag.tag';
const FOLDER = 'api::folder.folder';
const SEO = 'shared.seo';
const CARD = 'shared.card';

const user = {
  uid: USER,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  options: {},
  attributes: { name: { type: 'string' } },
} satisfies Model;

/**
 * Draft & publish, with a relation to another draft & publish type (`tags`) and one to a type
 * without it (`folder`, whose `articles` link to both versions of an article)
 */
const article = {
  uid: ARTICLE,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' },
    author: { type: 'relation', relation: 'oneToOne', target: USER },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG },
    seo: { type: 'component', component: SEO, repeatable: false },
    blocks: { type: 'dynamiczone', components: [SEO] },
    pinned: { type: 'relation', relation: 'morphToMany' },
    cover: { type: 'media', multiple: false },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER },
    sections: { type: 'dynamiczone', components: [CARD] },
  },
} satisfies Model;

const tag = {
  uid: TAG,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'tag', pluralName: 'tags', displayName: 'Tag' },
  options: { draftAndPublish: true },
  attributes: { name: { type: 'string' } },
} satisfies Model;

/** Without draft & publish, with a relation to articles */
const folder = {
  uid: FOLDER,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'folder', pluralName: 'folders', displayName: 'Folder' },
  options: {},
  attributes: {
    name: { type: 'string' },
    articles: { type: 'relation', relation: 'oneToMany', target: ARTICLE },
  },
} satisfies Model;

const seo = {
  uid: SEO,
  modelType: 'component' as const,
  info: { displayName: 'seo' },
  options: {},
  attributes: {
    metaTitle: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG },
  },
} satisfies Model;

/** A component with no draft & publish relation of its own: what it reaches is one level deeper */
const card = {
  uid: CARD,
  modelType: 'component' as const,
  info: { displayName: 'card' },
  options: {},
  attributes: {
    label: { type: 'string' },
    folder: { type: 'relation', relation: 'oneToOne', target: FOLDER },
  },
} satisfies Model;

const file = {
  uid: 'plugin::upload.file',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'file', pluralName: 'files', displayName: 'File' },
  options: {},
  attributes: { name: { type: 'string' } },
} satisfies Model;

const models: Record<string, Model> = {
  [USER]: user,
  [ARTICLE]: article,
  [TAG]: tag,
  [FOLDER]: folder,
  [SEO]: seo,
  [CARD]: card,
  [file.uid]: file,
};
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

/** What the checker hands out for an `is-owner(author)` condition */
const OWN_ARTICLES = { author: { documentId: { $eq: 'A' } } };
const OWN_TAGS = { name: { $startsWith: 'a-' } };
const EXISTS = { id: { $notNull: true } };

/** `<action> <uid>` → what the caller's rows give; a pair it doesn't list is held by no row */
type Rows = Record<string, Record<string, unknown> | null>;

interface FakeChecker extends PermissionChecker {
  asked: string[];
  recorded: ExplainEntry[];
}

/**
 * An active checker answering as the real one does: `filtersFor` gives a pair's filter,
 * `{}` for a pair it holds no row for, and `null` for `read-drafts` and `publish` without a row.
 * `canReadDrafts` is a held `read-drafts` row whose filter isn't the deny filter.
 */
const fakeChecker = (rows: Rows = {}, overrides: Partial<PermissionChecker> = {}): FakeChecker => {
  const asked: string[] = [];
  const recorded: ExplainEntry[] = [];
  const answer = (action: string, uid: string) => {
    const key = `${action} ${uid}`;

    if (key in rows) {
      return cloneDeep(rows[key]);
    }

    return action === 'read-drafts' || action === 'publish' ? null : {};
  };

  return {
    asked,
    recorded,
    isActive: () => true,
    filtersFor(_auth, action, uid) {
      asked.push(`filtersFor ${action} ${uid}`);

      return answer(action, uid);
    },
    canReadDrafts(_auth, uid) {
      asked.push(`canReadDrafts ${uid}`);

      return `read-drafts ${uid}` in rows && !deniesAll(answer('read-drafts', uid));
    },
    fieldsFor: () => ({ always: null, conditional: [] }),
    readableFields: () => null,
    writableFields: () => null,
    lockedFields: () => [],
    stampFor: () => ({}),
    populateDepth: () => null,
    record(_auth, entry) {
      recorded.push(entry);
    },
    ...overrides,
  };
};

const createAPI = (checker: PermissionChecker) => ({
  sanitize: createAPISanitizers({ getModel, permissions: checker }),
  validate: createAPIValidators({ getModel, permissions: checker }),
});

const find = { auth, action: 'find' };

/** Whatever `fn` throws, or undefined */
const thrown = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    return error;
  }

  return undefined;
};

/** The drafts gate's refusal naming `uid`, as REST and GraphQL clients see it */
const forbidden = (uid: string) =>
  expect.objectContaining({
    name: 'PolicyError',
    message: 'Reading drafts is not allowed',
    details: { code: 'DRAFT_READ_FORBIDDEN', uid },
  });

const assertGate = (query: Record<string, unknown>, schema: Model, checker: PermissionChecker) =>
  assertDraftAccess(query, schema, { auth, checker, getModel });

beforeEach(() => {
  // The stock relation visitors ask `strapi.auth.verify` whether the caller may read the target
  (globalThis as unknown as { strapi: unknown }).strapi = {
    contentTypes: {
      [USER]: user,
      [ARTICLE]: article,
      [TAG]: tag,
      [FOLDER]: folder,
      [file.uid]: file,
    },
    components: { [SEO]: seo, [CARD]: card },
    getModel,
    auth: { verify: () => true },
  };
});

describe('drafts gate: the root', () => {
  it.each([
    ['status=draft', { status: 'draft' }],
    ['hasPublishedVersion=false', { hasPublishedVersion: 'false' }],
    ['publicationFilter=never-published', { publicationFilter: 'never-published' }],
  ])('answers 403 DRAFT_READ_FORBIDDEN to %s without read-drafts', async (_label, query) => {
    const checker = fakeChecker();
    const { validate } = createAPI(checker);

    const error = await thrown(() => validate.query(query, article, find));

    expect(error).toBeInstanceOf(PolicyError);
    expect(error).toEqual(forbidden(ARTICLE));
    await expect(assertGate(query, article, checker)).rejects.toEqual(forbidden(ARTICLE));
  });

  it('lets a caller with read-drafts read drafts', async () => {
    const { validate } = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: {} }));

    for (const query of [
      { status: 'draft' },
      { hasPublishedVersion: false },
      { publicationFilter: 'modified', status: 'draft' },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(validate.query(query, article, find)).resolves.toBeUndefined();
    }
  });

  it('keeps published reads unchanged', async () => {
    const checker = fakeChecker();
    const { validate } = createAPI(checker);

    await expect(validate.query({}, article, find)).resolves.toBeUndefined();
    await expect(validate.query({ status: 'published' }, article, find)).resolves.toBeUndefined();
    await expect(
      validate.query({ hasPublishedVersion: null, publicationFilter: undefined }, article, find)
    ).resolves.toBeUndefined();
    // Nothing asked about drafts when the query reads none
    expect(checker.asked.filter((question) => question.includes('read-drafts'))).toEqual([]);
  });

  it.each([
    ['an empty string', ''],
    ['another case', 'DRAFT'],
    ['a list', ['draft']],
    ['null', null],
    ['undefined', undefined],
  ])(
    'reads %s as a draft status, as the Document Service does',
    async (_label, status: unknown) => {
      const { validate } = createAPI(fakeChecker());

      await expect(validate.query({ status }, article, find)).rejects.toEqual(forbidden(ARTICLE));
    }
  );

  it('refuses a read-drafts row whose every condition fails (the deny filter is not null)', async () => {
    const denying = fakeChecker({ [`read-drafts ${ARTICLE}`]: { id: { $null: true } } });
    // A checker whose canReadDrafts says yes while its filter denies is refused too
    const inconsistent = fakeChecker(
      { [`read-drafts ${ARTICLE}`]: { id: { $null: true } } },
      { canReadDrafts: () => true }
    );

    for (const checker of [denying, inconsistent]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        createAPI(checker).validate.query({ status: 'draft' }, article, find)
      ).rejects.toEqual(forbidden(ARTICLE));
    }
  });

  it('needs no read-drafts on a type without draft & publish', async () => {
    const { validate } = createAPI(fakeChecker());

    await expect(
      validate.query({ status: 'draft', publicationFilter: 'modified' }, folder, find)
    ).resolves.toBeUndefined();
  });

  it("leaves a write's own draft alone: it writes drafts and returns them", async () => {
    const { validate } = createAPI(fakeChecker());

    for (const action of ['create', 'update', 'delete']) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        validate.query({ status: 'draft', populate: ['author'] }, article, { auth, action })
      ).resolves.toBeUndefined();
    }
  });

  it('gates the draft-and-publish types a write reaches', async () => {
    // No read-drafts on articles: the write's own root is exempt, its relations are not
    const withoutTags = createAPI(fakeChecker());
    const withTags = createAPI(fakeChecker({ [`read-drafts ${TAG}`]: OWN_TAGS }));

    for (const action of ['create', 'update', 'delete']) {
      for (const query of [
        { status: 'draft', populate: ['tags'] },
        { status: 'draft', filters: { tags: { name: 'x' } } },
        { status: 'draft', sort: 'tags.name' },
        { status: 'draft', populate: { seo: { populate: { tags: true } } } },
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(withoutTags.validate.query(query, article, { auth, action })).rejects.toEqual(
          forbidden(TAG)
        );
      }

      // eslint-disable-next-line no-await-in-loop
      await expect(
        withTags.validate.query({ status: 'draft', populate: ['tags'] }, article, { auth, action })
      ).resolves.toBeUndefined();
    }
  });

  it('gates a query that names no action, as GraphQL sends it', async () => {
    const { validate } = createAPI(fakeChecker());

    await expect(validate.query({ status: 'draft' }, article, { auth })).rejects.toEqual(
      forbidden(ARTICLE)
    );
  });

  it('asks an inactive checker nothing but isActive', async () => {
    const asked: string[] = [];
    const checker = fakeChecker(
      {},
      {
        isActive() {
          asked.push('isActive');

          return false;
        },
      }
    );

    await assertGate({ status: 'draft', populate: '*', filters: { tags: 1 } }, article, checker);
    await createAPI(checker).validate.query({ status: 'draft' }, article, find);

    expect(asked.length).toBeGreaterThan(0);
    expect(checker.asked).toEqual([]);
  });
});

describe('drafts gate: related draft & publish types under status=draft', () => {
  /** Read drafts of articles, not of tags */
  const articlesOnly = () => fakeChecker({ [`read-drafts ${ARTICLE}`]: {} });

  it.each([
    ['a string', 'tags'],
    ['a wildcard', '*'],
    ['a list', ['author', 'tags']],
    ['a comma string', 'author,tags'],
    ['true', { tags: true }],
    ["'true'", { tags: 'true' }],
    ['an object', { tags: { fields: ['name'] } }],
    ['a component path', 'seo.tags'],
    ['a component node', { seo: { populate: { tags: true } } }],
    ['a component wildcard', { seo: { populate: '*' } }],
    ['a dynamic-zone fragment', { blocks: { on: { [SEO]: { populate: ['tags'] } } } }],
    ['a dynamic-zone wildcard', { blocks: { populate: '*' } }],
    ['a dynamic-zone path', 'blocks.tags'],
    ['a morph fragment', { pinned: { on: { [TAG]: true } } }],
  ])('refuses populating tags through %s without read-drafts on tags', async (_label, populate) => {
    const { validate } = createAPI(articlesOnly());

    await expect(validate.query({ status: 'draft', populate }, article, find)).rejects.toEqual(
      forbidden(TAG)
    );
  });

  it('allows populating tags with read-drafts on both types', async () => {
    const { validate } = createAPI(
      fakeChecker({ [`read-drafts ${ARTICLE}`]: {}, [`read-drafts ${TAG}`]: OWN_TAGS })
    );

    await expect(
      validate.query({ status: 'draft', populate: ['tags', 'seo.tags'] }, article, find)
    ).resolves.toBeUndefined();
  });

  it('does not refuse what does not load tags', async () => {
    const { validate } = createAPI(articlesOnly());

    for (const populate of [
      'author',
      { tags: false },
      { tags: 'false' },
      { seo: true },
      { blocks: true },
      { cover: true },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        validate.query({ status: 'draft', populate }, article, find)
      ).resolves.toBeUndefined();
    }
  });

  it.each([
    ['a relation filter', { tags: { name: { $eq: 'x' } } }],
    ['an id match', { tags: { $in: [1, 2] } }],
    ['a filter inside $or', { $or: [{ title: 'x' }, { tags: { name: 'x' } }] }],
    ['a filter inside $not', { $not: { tags: { name: 'x' } } }],
    ['a component filter', { seo: { tags: { name: 'x' } } }],
  ])('refuses %s into tag drafts', async (_label, filters) => {
    const { validate } = createAPI(articlesOnly());

    await expect(validate.query({ status: 'draft', filters }, article, find)).rejects.toEqual(
      forbidden(TAG)
    );
  });

  it('refuses a sort through tags', async () => {
    const { validate } = createAPI(articlesOnly());

    await expect(
      validate.query({ status: 'draft', sort: 'tags.name:asc' }, article, find)
    ).rejects.toEqual(forbidden(TAG));
  });

  it("refuses what a populate node's filters, sort and populate reach", async () => {
    // Folders have no draft & publish; their articles do, and the tags of those
    const { validate } = createAPI(articlesOnly());

    for (const node of [
      { filters: { tags: { name: 'x' } } },
      { sort: ['tags.name'] },
      { populate: { tags: true } },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        validate.query({ status: 'draft', populate: { articles: node } }, folder, find)
      ).rejects.toEqual(forbidden(TAG));
    }
  });

  it("walks a dynamic zone's nested populate on each component, nodes and all", async () => {
    // A card has no tags of its own: its folder's articles' tags are two levels further down
    const { sanitize, validate } = createAPI(articlesOnly());

    for (const populate of [
      { sections: { populate: { folder: { populate: { articles: { populate: 'tags' } } } } } },
      {
        sections: {
          populate: { folder: { populate: { articles: { filters: { tags: { name: 'x' } } } } } },
        },
      },
      { sections: { populate: { folder: { populate: { articles: { sort: 'tags.name' } } } } } },
      { sections: { populate: ['folder.articles.tags'] } },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(validate.query({ status: 'draft', populate }, article, find)).rejects.toEqual(
        forbidden(TAG)
      );
    }

    // What sanitize.query does with the first, for a controller that skips validate.query
    const sanitized = await sanitize.query(
      {
        status: 'draft',
        populate: {
          sections: { populate: { folder: { populate: { articles: { populate: 'tags' } } } } },
        },
      },
      article,
      find
    );

    expect(sanitized.populate).toEqual({
      sections: {
        on: {
          [CARD]: {
            populate: {
              folder: {
                populate: {
                  articles: { populate: { tags: { filters: DENY_ALL_FILTER } } },
                },
              },
            },
          },
        },
      },
    });

    // A zone's '*' still checks every relation of each component; a path that reaches no tags
    // passes the gate (the stock populate validator then refuses any nested zone populate but '*')
    await expect(
      validate.query({ status: 'draft', populate: { blocks: { populate: '*' } } }, article, find)
    ).rejects.toEqual(forbidden(TAG));
    await expect(
      assertGate(
        {
          status: 'draft',
          populate: { sections: { populate: { folder: { populate: 'articles' } } } },
        },
        article,
        articlesOnly()
      )
    ).resolves.toBeUndefined();
  });

  it('names the type reached from a root without draft & publish', async () => {
    const { validate } = createAPI(fakeChecker());

    await expect(
      validate.query({ status: 'draft', populate: 'articles' }, folder, find)
    ).rejects.toEqual(forbidden(ARTICLE));
    await expect(
      validate.query({ status: 'draft', filters: { articles: { title: 'x' } } }, folder, find)
    ).rejects.toEqual(forbidden(ARTICLE));
  });

  it('refuses the root first', async () => {
    const { validate } = createAPI(fakeChecker());

    await expect(
      validate.query({ status: 'draft', populate: 'tags' }, article, find)
    ).rejects.toEqual(forbidden(ARTICLE));
  });

  it('needs read-drafts on populated targets under a publication filter, not on relation filters', async () => {
    const { validate } = createAPI(articlesOnly());

    await expect(
      validate.query({ publicationFilter: 'modified', populate: 'tags' }, article, find)
    ).rejects.toEqual(forbidden(TAG));
    // A published read joins published tags only
    await expect(
      validate.query(
        { publicationFilter: 'modified', filters: { tags: { name: 'x' } }, sort: 'tags.name' },
        article,
        find
      )
    ).resolves.toBeUndefined();
  });

  it('asks about each type once', async () => {
    const checker = fakeChecker({ [`read-drafts ${ARTICLE}`]: {}, [`read-drafts ${TAG}`]: {} });

    await assertGate(
      {
        status: 'draft',
        filters: { tags: { name: 'x' }, seo: { tags: { name: 'y' } } },
        sort: 'tags.name',
        populate: ['tags', 'seo.tags'],
      },
      article,
      checker
    );

    expect(checker.asked.filter((question) => question.startsWith('canReadDrafts'))).toEqual([
      `canReadDrafts ${ARTICLE}`,
      `canReadDrafts ${TAG}`,
    ]);
  });
});

describe('drafts gate in sanitize.query', () => {
  it('throws a PolicyError and removes status=draft in sanitize.query for a caller without read-drafts', async () => {
    const checker = fakeChecker();
    const { sanitize, validate } = createAPI(checker);
    const query = {
      status: 'draft',
      hasPublishedVersion: 'false',
      publicationFilter: 'never-published',
      filters: { title: 'x' },
    };

    await expect(validate.query(query, article, find)).rejects.toBeInstanceOf(PolicyError);

    const sanitized = await sanitize.query(query, article, find);

    // A published read: the Document Service reads a missing status as draft, so it is set
    expect(sanitized.status).toBe('published');
    expect(sanitized).not.toHaveProperty('hasPublishedVersion');
    expect(sanitized).not.toHaveProperty('publicationFilter');
    expect(sanitized.filters).toEqual({ title: 'x' });
    expect(checker.recorded).toEqual([{ kind: 'draft-status-removed', uid: ARTICLE }]);
  });

  it('removes a publication filter alone without adding a status', async () => {
    const { sanitize } = createAPI(fakeChecker());

    expect(await sanitize.query({ publicationFilter: 'modified' }, article, find)).toEqual({});
  });

  it('keeps the status of a caller with read-drafts and ANDs its read-drafts condition', async () => {
    const checker = fakeChecker({
      [`find ${ARTICLE}`]: OWN_ARTICLES,
      [`read-drafts ${ARTICLE}`]: { title: { $startsWith: 'mine' } },
    });
    const { sanitize } = createAPI(checker);

    const sanitized = await sanitize.query(
      { status: 'draft', filters: { title: 'x' } },
      article,
      find
    );

    expect(sanitized.status).toBe('draft');
    expect(sanitized.filters).toEqual({
      $and: [{ title: 'x' }, { $and: [OWN_ARTICLES, { title: { $startsWith: 'mine' } }] }],
    });
    expect(checker.recorded).toEqual([
      expect.objectContaining({ kind: 'condition-applied', uid: ARTICLE, action: 'find' }),
      expect.objectContaining({ kind: 'condition-applied', uid: ARTICLE, action: 'read-drafts' }),
    ]);
  });

  it('limits drafts to the read-drafts condition when find is unconditioned', async () => {
    const { sanitize } = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: OWN_ARTICLES }));

    expect((await sanitize.query({ status: 'draft' }, article, find)).filters).toEqual(
      OWN_ARTICLES
    );
    // A published read does not read the read-drafts rows
    expect((await sanitize.query({}, article, find)).filters).toBeUndefined();
  });

  it('conditions populated tags by find and read-drafts, and denies them without read-drafts', async () => {
    const withTags = fakeChecker({
      [`read-drafts ${ARTICLE}`]: {},
      [`find ${TAG}`]: { name: { $ne: 'hidden' } },
      [`read-drafts ${TAG}`]: OWN_TAGS,
    });
    const withoutTags = fakeChecker({ [`read-drafts ${ARTICLE}`]: {} });

    const allowed = await createAPI(withTags).sanitize.query(
      { status: 'draft', populate: { tags: true, seo: { populate: { tags: true } } } },
      article,
      find
    );
    const denied = await createAPI(withoutTags).sanitize.query(
      { status: 'draft', populate: 'tags' },
      article,
      find
    );

    const both = { $and: [{ name: { $ne: 'hidden' } }, OWN_TAGS] };

    expect(allowed.populate).toEqual({
      tags: { filters: both },
      seo: { populate: { tags: { filters: both } } },
    });
    expect(denied.populate).toEqual({ tags: { filters: DENY_ALL_FILTER } });

    // A dotted path through a dynamic zone reaches every component's tags
    const throughZone = await createAPI(withoutTags).sanitize.query(
      { status: 'draft', populate: 'blocks.tags' },
      article,
      find
    );

    expect(throughZone.populate).toEqual({
      blocks: { on: { [SEO]: { populate: { tags: { filters: DENY_ALL_FILTER } } } } },
    });
  });

  it('conditions a relation filter into tag drafts and its existence', async () => {
    const { sanitize } = createAPI(
      fakeChecker({ [`read-drafts ${ARTICLE}`]: {}, [`read-drafts ${TAG}`]: OWN_TAGS })
    );

    const sanitized = await sanitize.query(
      { status: 'draft', filters: { tags: { name: 'x' } } },
      article,
      find
    );

    expect(sanitized.filters).toEqual({ tags: { $and: [{ name: 'x' }, OWN_TAGS, EXISTS] } });
  });

  it('drops a sort through tags whose read-drafts is conditioned, and validate refuses it', async () => {
    const checker = fakeChecker({
      [`read-drafts ${ARTICLE}`]: {},
      [`read-drafts ${TAG}`]: OWN_TAGS,
    });
    const { sanitize, validate } = createAPI(checker);
    const query = { status: 'draft', sort: ['tags.name:asc', 'title:asc'] };

    const sanitized = await sanitize.query(query, article, find);
    const error = await thrown(() => validate.query(query, article, find));

    expect(sanitized.sort).toEqual(['title:asc']);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toMatchObject({ key: 'tags', param: 'sort' });
    // A published read sorts through published tags: nothing to drop
    expect((await sanitize.query({ sort: query.sort }, article, find)).sort).toEqual(query.sort);
  });

  it('denies a $not over tag drafts whose read-drafts is conditioned', async () => {
    const { sanitize, validate } = createAPI(
      fakeChecker({ [`read-drafts ${ARTICLE}`]: {}, [`read-drafts ${TAG}`]: OWN_TAGS })
    );
    const query = { status: 'draft', filters: { $not: { tags: { name: 'x' } } } };

    expect((await sanitize.query(query, article, find)).filters).toEqual({
      $not: { $or: [{ id: { $null: true } }, { id: { $notNull: true } }] },
    });
    await expect(validate.query(query, article, find)).rejects.toBeInstanceOf(ValidationError);
  });

  it('conditions populated targets under a publication filter, not relation filters', async () => {
    const { sanitize } = createAPI(
      fakeChecker({ [`read-drafts ${ARTICLE}`]: {}, [`read-drafts ${TAG}`]: OWN_TAGS })
    );

    const sanitized = await sanitize.query(
      { publicationFilter: 'modified', populate: 'tags', filters: { tags: { name: 'x' } } },
      article,
      find
    );

    expect(sanitized.populate).toEqual({ tags: { filters: OWN_TAGS } });
    expect(sanitized.filters).toEqual({ tags: { name: 'x' } });
  });

  it('denies populated drafts reached from a root without draft & publish', async () => {
    const { sanitize } = createAPI(fakeChecker());

    const sanitized = await sanitize.query(
      { status: 'draft', populate: { articles: { populate: 'author' } } },
      folder,
      find
    );

    expect(sanitized.status).toBe('draft');
    expect(sanitized.populate).toEqual({
      articles: { populate: 'author', filters: DENY_ALL_FILTER },
    });
  });

  it('leaves populated published reads and types without draft & publish alone', async () => {
    const { sanitize } = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: {} }));

    expect((await sanitize.query({ populate: 'tags' }, article, find)).populate).toEqual('tags');
    expect(
      (await sanitize.query({ status: 'draft', populate: 'author' }, article, find)).populate
    ).toEqual('author');
  });

  it("returns a write's own draft: its status is kept and its root gets no read-drafts filter", async () => {
    // A conditioned read-drafts row on articles would narrow a read; it does not narrow a write
    const checker = fakeChecker({ [`read-drafts ${ARTICLE}`]: OWN_ARTICLES });
    const { sanitize } = createAPI(checker);

    for (const action of ['create', 'update', 'delete']) {
      // eslint-disable-next-line no-await-in-loop
      const sanitized = await sanitize.query(
        { status: 'draft', publicationFilter: 'modified', populate: 'author' },
        article,
        { auth, action }
      );

      expect(sanitized).toEqual({
        status: 'draft',
        publicationFilter: 'modified',
        populate: 'author',
      });
    }

    // Nothing it reaches has draft & publish, so nothing is asked about drafts
    expect(
      checker.asked.filter(
        (question) => question.includes('read-drafts') || question.startsWith('canReadDrafts')
      )
    ).toEqual([]);
    expect(checker.recorded).toEqual([]);
  });

  it('gets an update the published versions only of a related type it may not read drafts of', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);
    const update = { auth, action: 'update' };

    // A draft links to drafts, so its tags have no published version to show: nothing is shown
    // (the query layer applies the draft status to populated types, so a published-only filter
    // would match nothing either). The draft itself is still returned
    const draft = await sanitize.query(
      { status: 'draft', populate: { tags: true, seo: { populate: 'tags' } } },
      article,
      update
    );

    expect(draft).toEqual({
      status: 'draft',
      populate: {
        tags: { filters: DENY_ALL_FILTER },
        seo: { populate: { tags: { filters: DENY_ALL_FILTER } } },
      },
    });
    expect(checker.recorded).toEqual([
      expect.objectContaining({ kind: 'condition-applied', uid: TAG, action: 'read-drafts' }),
      expect.objectContaining({ kind: 'condition-applied', uid: TAG, action: 'read-drafts' }),
    ]);

    // A write that publishes returns published tags: nothing to restrict
    expect(
      await sanitize.query({ status: 'published', populate: 'tags' }, article, update)
    ).toEqual({ status: 'published', populate: 'tags' });
    expect(await sanitize.query({ populate: 'tags' }, article, update)).toEqual({
      populate: 'tags',
    });
  });

  it("restricts a write's relation filters, sorts and populate by read-drafts on the related type", async () => {
    const { sanitize } = createAPI(fakeChecker({ [`read-drafts ${TAG}`]: OWN_TAGS }));

    const sanitized = await sanitize.query(
      {
        status: 'draft',
        filters: { tags: { name: 'x' } },
        sort: ['tags.name', 'title'],
        populate: 'tags',
      },
      article,
      { auth, action: 'update' }
    );

    expect(sanitized).toEqual({
      status: 'draft',
      filters: { tags: { $and: [{ name: 'x' }, OWN_TAGS, EXISTS] } },
      sort: ['title'],
      populate: { tags: { filters: OWN_TAGS } },
    });
  });

  it('returns the same query to an inactive checker', async () => {
    const query = { status: 'draft', populate: 'tags' };
    const checker = fakeChecker({}, { isActive: () => false });

    expect(await createAPI(checker).sanitize.query(query, article, find)).toEqual(query);
    expect(checker.asked).toEqual([]);
  });
});

describe('relation filters and sorts that join drafts outside a draft read', () => {
  /** What a join into an article gets when the caller may not read its drafts */
  const PUBLISHED = { publishedAt: { $notNull: true } };
  const EVERY_ROW = { $or: [{ id: { $null: true } }, { id: { $notNull: true } }] };

  it('keeps a filter from a type without draft & publish to published articles', async () => {
    // Folders link to both versions of an article: the status filter does not reach the join
    const checker = fakeChecker();
    const { sanitize, validate } = createAPI(checker);
    const query = { filters: { articles: { title: 'draft title' } } };

    expect((await sanitize.query(query, folder, find)).filters).toEqual({
      articles: { $and: [{ title: 'draft title' }, PUBLISHED, EXISTS] },
    });
    // Recorded as the read-drafts restriction it is; validate lets the filter through
    expect(checker.recorded).toEqual([
      expect.objectContaining({
        kind: 'condition-applied',
        uid: ARTICLE,
        action: 'read-drafts',
        at: 'filter',
        path: 'articles',
      }),
    ]);
    await expect(validate.query(query, folder, find)).resolves.toBeUndefined();
  });

  it('applies at a crossing below the root: articles, then a folder, then its articles', async () => {
    const { sanitize } = createAPI(fakeChecker());

    const sanitized = await sanitize.query(
      { filters: { folder: { articles: { title: 'draft title' } } } },
      article,
      find
    );

    expect(sanitized.filters).toEqual({
      folder: { articles: { $and: [{ title: 'draft title' }, PUBLISHED, EXISTS] } },
    });
    // Inside $or too, beside a filter on the folder that crosses nothing
    const insideOr = await sanitize.query(
      { filters: { $or: [{ folder: { name: 'f' } }, { folder: { articles: { id: 1 } } }] } },
      article,
      find
    );

    expect(insideOr.filters).toEqual({
      $or: [
        { folder: { name: 'f' } },
        { folder: { articles: { $and: [{ id: 1 }, PUBLISHED, EXISTS] } } },
      ],
    });
  });

  it('leaves joins from published versions alone: a type with draft & publish, and its components', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);
    const query = {
      filters: { tags: { name: 'x' }, seo: { tags: { name: 'y' } } },
      sort: ['tags.name', 'seo.tags.name'],
    };

    expect(await sanitize.query(query, article, find)).toEqual(query);
    expect(checker.asked.filter((question) => question.includes('read-drafts'))).toEqual([]);
  });

  it('carries on past articles whose drafts the caller may read: their links reach tag drafts', async () => {
    // read-drafts on articles (unrestricted), none on tags
    const { sanitize } = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: {} }));

    expect(
      (await sanitize.query({ filters: { articles: { tags: { name: 'x' } } } }, folder, find))
        .filters
    ).toEqual({ articles: { tags: { $and: [{ name: 'x' }, PUBLISHED, EXISTS] } } });

    // Without read-drafts on articles, the published clause on them keeps their tags published
    const { sanitize: without } = createAPI(fakeChecker());

    expect(
      (await without.query({ filters: { articles: { tags: { name: 'x' } } } }, folder, find))
        .filters
    ).toEqual({ articles: { $and: [{ tags: { name: 'x' } }, PUBLISHED, EXISTS] } });
  });

  it('lets in the drafts a conditioned read-drafts row allows, and nothing more', async () => {
    const conditioned = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: OWN_ARTICLES }));
    const withFind = createAPI(
      fakeChecker({
        [`find ${ARTICLE}`]: { title: { $ne: 'hidden' } },
        [`read-drafts ${ARTICLE}`]: OWN_ARTICLES,
      })
    );
    const unrestricted = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: {} }));
    const query = { filters: { articles: { title: 'x' } } };

    expect((await conditioned.sanitize.query(query, folder, find)).filters).toEqual({
      articles: { $and: [{ title: 'x' }, { $or: [PUBLISHED, OWN_ARTICLES] }, EXISTS] },
    });
    expect((await withFind.sanitize.query(query, folder, find)).filters).toEqual({
      articles: {
        $and: [
          { title: 'x' },
          { $and: [{ title: { $ne: 'hidden' } }, { $or: [PUBLISHED, OWN_ARTICLES] }] },
          EXISTS,
        ],
      },
    });
    // Every draft readable: nothing to add
    expect((await unrestricted.sanitize.query(query, folder, find)).filters).toEqual(query.filters);
  });

  it('drops such a sort, and validate refuses it', async () => {
    const { sanitize, validate } = createAPI(fakeChecker());
    const query = { sort: ['articles.title:asc', 'name:asc'] };

    const error = await thrown(() => validate.query(query, folder, find));

    expect((await sanitize.query(query, folder, find)).sort).toEqual(['name:asc']);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toMatchObject({
      key: 'articles',
      path: 'articles',
      param: 'sort',
    });

    // Below the root, and with a conditioned read-drafts row, the same
    const conditioned = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: OWN_ARTICLES }));

    await expect(
      validate.query({ sort: 'folder.articles.title' }, article, find)
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(conditioned.validate.query(query, folder, find)).rejects.toBeInstanceOf(
      ValidationError
    );

    // Every draft readable: the sort stays and passes
    const unrestricted = createAPI(fakeChecker({ [`read-drafts ${ARTICLE}`]: {} }));

    expect((await unrestricted.sanitize.query(query, folder, find)).sort).toEqual(query.sort);
    await expect(unrestricted.validate.query(query, folder, find)).resolves.toBeUndefined();
  });

  it('denies such a $not, and validate refuses it', async () => {
    const { sanitize, validate } = createAPI(fakeChecker());
    const query = { filters: { $not: { articles: { title: 'x' } } } };

    expect((await sanitize.query(query, folder, find)).filters).toEqual({ $not: EVERY_ROW });
    await expect(validate.query(query, folder, find)).rejects.toBeInstanceOf(ValidationError);
    // A $not on the root's own fields is untouched
    expect(
      (await sanitize.query({ filters: { $not: { name: 'x' } } }, folder, find)).filters
    ).toEqual({ $not: { name: 'x' } });
  });

  it("applies in a populate node's filters and sort by the node's rows", async () => {
    const { sanitize, validate } = createAPI(fakeChecker());

    // A populated folder has no versions: its articles are joined at both
    const fromArticle = await sanitize.query(
      { populate: { folder: { filters: { articles: { title: 'x' } }, sort: 'articles.title' } } },
      article,
      find
    );

    expect(fromArticle.populate).toEqual({
      folder: { filters: { articles: { $and: [{ title: 'x' }, PUBLISHED, EXISTS] } } },
    });
    await expect(
      validate.query({ populate: { folder: { sort: 'articles.title' } } }, article, find)
    ).rejects.toBeInstanceOf(ValidationError);

    // Populated articles are published versions (the status reaches populate): their tags too
    const query = {
      populate: { articles: { filters: { tags: { name: 'x' } }, sort: 'tags.name' } },
    };

    expect(await sanitize.query(query, folder, find)).toEqual(query);
    await expect(validate.query(query, folder, find)).resolves.toBeUndefined();
  });

  it('leaves draft reads to the drafts gate, and an inactive checker alone', async () => {
    // Under status=draft the gate's own rule applies: read-drafts filters, or the deny filter
    const { sanitize } = createAPI(
      fakeChecker({ [`read-drafts ${ARTICLE}`]: OWN_ARTICLES, [`read-drafts ${TAG}`]: {} })
    );

    expect(
      (
        await sanitize.query(
          { status: 'draft', filters: { articles: { title: 'x' } } },
          folder,
          find
        )
      ).filters
    ).toEqual({ articles: { $and: [{ title: 'x' }, OWN_ARTICLES, EXISTS] } });

    const query = { filters: { articles: { title: 'x' } }, sort: 'articles.title' };
    const checker = fakeChecker({}, { isActive: () => false });
    const inactive = createAPI(checker);

    expect(await inactive.sanitize.query(query, folder, find)).toEqual(query);
    await expect(inactive.validate.query(query, folder, find)).resolves.toBeUndefined();
    expect(checker.asked).toEqual([]);
  });
});
