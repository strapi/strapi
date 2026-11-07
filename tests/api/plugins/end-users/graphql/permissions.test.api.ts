import { createAuthRequest, createRequest } from 'api-tests/request';
import {
  ARTICLE_UID,
  FOLDER_UID,
  NOTE_UID,
  TAG_UID,
  USER_UID,
  createFixturesInstance,
} from '../utils/fixtures';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  bearer,
  createSignedInUser,
  emptyTables,
  owned,
  resetRoles,
  setRolePermissions,
  unconditioned,
} from '../utils/permissions';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';

const TOKEN_NAME = 'end-users-graphql-test';
const NOTE_FIELDS = ['title', 'body', 'owner'];

/**
 * Authenticated: notes are read and written by their owner only (`secret` is not in the read
 * lists, and a note is created with `title` and `body`); articles are read (`read-drafts` on the
 * articles, not on the tags), created with `title` only and never published; the engine's user
 * type is updatable on every field.
 */
const GRANTS = [
  ...DEFAULT_AUTHENTICATED_PERMISSIONS,
  owned(`${NOTE_UID}.find`, NOTE_UID, 'owner', { fields: NOTE_FIELDS }),
  owned(`${NOTE_UID}.findOne`, NOTE_UID, 'owner', { fields: NOTE_FIELDS }),
  owned(`${NOTE_UID}.create`, NOTE_UID, 'owner', { fields: ['title', 'body'] }),
  owned(`${NOTE_UID}.update`, NOTE_UID, 'owner'),
  owned(`${NOTE_UID}.delete`, NOTE_UID, 'owner'),
  unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID),
  unconditioned(`${ARTICLE_UID}.findOne`, ARTICLE_UID),
  unconditioned(`${ARTICLE_UID}.read-drafts`, ARTICLE_UID),
  unconditioned(`${ARTICLE_UID}.create`, ARTICLE_UID, { fields: ['title'] }),
  unconditioned(`${TAG_UID}.find`, TAG_UID),
  unconditioned(`${USER_UID}.update`, USER_UID, { fields: null }),
];

describe('end-users: the content api permissions on GraphQL', () => {
  let strapi;
  let rq;
  let a: { token: string; documentId: string };
  let b: { token: string; documentId: string };
  let noteA: { documentId: string };
  let noteB: { documentId: string };

  const gql = (token: string, query: string) =>
    rq.post('/graphql', { headers: bearer(token), body: { query } });

  const grant = (rows: unknown[]) => setRolePermissions(strapi, 'authenticated', rows as never);

  const createNote = (title: string, owner: string) =>
    strapi.documents(NOTE_UID).create({
      data: { title, body: 'text', secret: 'hidden', owner: { connect: [{ documentId: owner }] } },
    });

  const emptyAll = () =>
    emptyTables(strapi, [NOTE_UID, FOLDER_UID, ARTICLE_UID, TAG_UID, PROFILE_UID, ...ENGINE_UIDS]);

  beforeAll(async () => {
    strapi = await createFixturesInstance();
    rq = createRequest({ strapi });

    await emptyAll();
    await resetRoles(strapi);
    await grant(GRANTS);

    a = await createSignedInUser(rq, 'graphql-a@example.com');
    b = await createSignedInUser(rq, 'graphql-b@example.com');

    noteA = await createNote('a note', a.documentId);
    noteB = await createNote('b note', b.documentId);
  });

  afterAll(async () => {
    await emptyAll();
    await resetRoles(strapi);
    await strapi.db
      .query('admin::api-token')
      .deleteMany({ where: { name: { $startsWith: TOKEN_NAME } } });
    await strapi.destroy();
  });

  describe('queries', () => {
    it("returns null for a field the role cannot read on every row, lists only the caller's notes, and answers note(documentId) for their own note only", async () => {
      const list = await gql(a.token, '{ notes { documentId title secret } }');

      expect(list.statusCode).toBe(200);
      expect(list.body.errors).toBeUndefined();
      expect(list.body.data.notes).toEqual([
        { documentId: noteA.documentId, title: 'a note', secret: null },
      ]);

      const theirs = await gql(
        a.token,
        `{ note(documentId: "${noteB.documentId}") { documentId } }`
      );

      expect(theirs.body.errors).toBeUndefined();
      expect(theirs.body.data.note).toBeNull();

      const own = await gql(a.token, `{ note(documentId: "${noteA.documentId}") { title } }`);

      expect(own.body.errors).toBeUndefined();
      expect(own.body.data.note).toEqual({ title: 'a note' });
    });

    it('refuses a nested relation that inherits DRAFT without read-drafts on its target, and reads it on a published query', async () => {
      const tag = await strapi.documents(TAG_UID).create({ data: { name: 'draft tag' } });

      await strapi.documents(ARTICLE_UID).create({
        data: { title: 'with a draft tag', tags: { connect: [{ documentId: tag.documentId }] } },
      });

      const res = await gql(a.token, '{ articles(status: DRAFT) { title tags { name } } }');

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(res.body.errors[0].extensions.error.details).toMatchObject({
        code: 'DRAFT_READ_FORBIDDEN',
        uid: TAG_UID,
      });

      const published = await gql(a.token, '{ articles { title tags { name } } }');

      expect(published.body.errors).toBeUndefined();
    });

    describe('nested fields of a parent the role cannot read', () => {
      const WITHOUT_ARTICLE_FIND = GRANTS.filter(
        (grant_) => grant_.action !== `${ARTICLE_UID}.find`
      );

      afterAll(() => grant(GRANTS));

      it("resolves a relation missing from the parent's find list to null, with no error", async () => {
        // The folders are the role's to find: what hides `folder` is the notes' find list. Without a
        // find on the folders, the field's own scope check answers FORBIDDEN before any field rule
        await grant([...GRANTS, unconditioned(`${FOLDER_UID}.find`, FOLDER_UID)]);

        const folder = await strapi.documents(FOLDER_UID).create({ data: { name: 'private' } });

        await strapi.documents(NOTE_UID).update({
          documentId: noteA.documentId,
          data: { folder: { connect: [{ documentId: folder.documentId }] } },
        });

        const res = await gql(a.token, '{ notes { documentId folder { name } } }');

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.notes.every((note) => note.folder === null)).toBe(true);
      });

      it('resolves a component missing from the find list to null, and cuts the rows of one it lists to the listed sub-fields', async () => {
        await strapi.documents(ARTICLE_UID).create({
          status: 'published',
          data: { title: 'with seo', seo: { metaTitle: 'meta', metaDescription: 'hidden' } },
        });

        await grant([
          ...WITHOUT_ARTICLE_FIND,
          unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID, { fields: ['title'] }),
        ]);

        const hidden = await gql(a.token, '{ articles { title seo { metaTitle } } }');

        expect(hidden.body.errors).toBeUndefined();
        expect(hidden.body.data.articles.length).toBeGreaterThan(0);
        expect(hidden.body.data.articles.every((article) => article.seo === null)).toBe(true);

        await grant([
          ...WITHOUT_ARTICLE_FIND,
          unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID, { fields: ['title', 'seo.metaTitle'] }),
        ]);

        const partial = await gql(
          a.token,
          '{ articles { title seo { metaTitle metaDescription } } }'
        );

        expect(partial.body.errors).toBeUndefined();

        const withSeo = partial.body.data.articles.find((article) => article.title === 'with seo');

        expect(withSeo.seo).toMatchObject({ metaTitle: 'meta', metaDescription: null });
      });
    });
  });

  describe('the schema', () => {
    const namesOf = async (query: string, pick: (data) => Array<{ name: string }>) => {
      const res = await gql(a.token, query);

      return pick(res.body.data).map(({ name }) => name);
    };

    it('exposes EndUser, its roles and its profile, and no session, account, jwk or permission queries', async () => {
      const queries = await namesOf(
        '{ __schema { queryType { fields { name } } } }',
        (data) => data.__schema.queryType.fields
      );
      const types = await namesOf('{ __schema { types { name } } }', (data) => data.__schema.types);

      expect(queries).toEqual(
        expect.arrayContaining(['endUsers', 'endUser', 'endUserRoles', 'endUserProfiles'])
      );

      for (const hidden of [
        'sessions',
        'accounts',
        'jwks',
        'permissions',
        'verifications',
        'twoFactors',
      ]) {
        expect(queries).not.toContain(hidden);
      }

      expect(types).toEqual(expect.arrayContaining(['EndUser', 'EndUserRole', 'EndUserProfile']));
      expect(types).not.toContain('EndUsersUser');
    });

    it('returns a hidden required field as null without nulling its parent', async () => {
      await grant([
        ...GRANTS.filter((grant_) => grant_.action !== `${ARTICLE_UID}.find`),
        unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID, { fields: ['body'] }),
      ]);

      try {
        await strapi.documents(ARTICLE_UID).create({
          status: 'published',
          data: { title: 'a required title', body: 'visible' },
        });

        const res = await gql(a.token, '{ articles { documentId title body } }');

        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.articles.length).toBeGreaterThan(0);
        expect(res.body.data.articles.every((article) => article.title === null)).toBe(true);
        expect(
          res.body.data.articles.every((article) => typeof article.documentId === 'string')
        ).toBe(true);
      } finally {
        await grant(GRANTS);
      }
    });
  });

  describe('mutations', () => {
    it("refuses updateNote and deleteNote on someone else's note with NotFoundError and leaves it as it was, and updates and deletes the caller's own", async () => {
      const update = await gql(
        a.token,
        `mutation { updateNote(documentId: "${noteB.documentId}", data: { title: "taken" }) { documentId } }`
      );

      expect(update.body.errors[0].extensions.error.name).toBe('NotFoundError');

      const del = await gql(
        a.token,
        `mutation { deleteNote(documentId: "${noteB.documentId}") { documentId } }`
      );

      expect(del.body.errors[0].extensions.error.name).toBe('NotFoundError');
      expect(
        (await strapi.documents(NOTE_UID).findOne({ documentId: noteB.documentId })).title
      ).toBe('b note');

      const own = await gql(
        a.token,
        `mutation { updateNote(documentId: "${noteA.documentId}", data: { title: "renamed" }) { title secret } }`
      );

      expect(own.body.errors).toBeUndefined();
      expect(own.body.data.updateNote).toEqual({ title: 'renamed', secret: null });

      const toDelete = await createNote('to delete', a.documentId);
      const deleted = await gql(
        a.token,
        `mutation { deleteNote(documentId: "${toDelete.documentId}") { documentId } }`
      );

      expect(deleted.body.errors).toBeUndefined();
      expect(
        await strapi.documents(NOTE_UID).findOne({ documentId: toDelete.documentId })
      ).toBeNull();
    });

    it('stamps the owner on createNote', async () => {
      // The owner is read from the database: selecting `owner` would need a find on the users,
      // which this role does not hold (the field's own scope check answers FORBIDDEN first)
      const res = await gql(
        a.token,
        'mutation { createNote(data: { title: "stamped" }) { documentId } }'
      );

      expect(res.body.errors).toBeUndefined();

      const stored = await strapi.documents(NOTE_UID).findOne({
        documentId: res.body.data.createNote.documentId,
        populate: ['owner'],
      });

      expect(stored.owner.documentId).toBe(a.documentId);
    });

    it('creates a draft through createArticle without publish even when PUBLISHED is asked, and rejects a field outside the create list', async () => {
      const res = await gql(
        a.token,
        'mutation { createArticle(status: PUBLISHED, data: { title: "mine" }) { documentId publishedAt } }'
      );

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.createArticle.publishedAt).toBeNull();

      const { documentId } = res.body.data.createArticle;

      expect(
        await strapi
          .documents(ARTICLE_UID)
          .count({ filters: { documentId } as any, status: 'draft' })
      ).toBe(1);
      expect(
        await strapi
          .documents(ARTICLE_UID)
          .count({ filters: { documentId } as any, status: 'published' })
      ).toBe(0);

      const outside = await gql(
        a.token,
        'mutation { createArticle(data: { title: "t", body: "not allowed" }) { documentId } }'
      );

      expect(outside.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(outside.body.errors[0].message).toContain('body');
    });

    it('refuses emailVerified in updateEndUser with BAD_USER_INPUT, naming the field', async () => {
      const res = await gql(
        a.token,
        `mutation { updateEndUser(documentId: "${a.documentId}", data: { emailVerified: true }) { documentId } }`
      );

      expect(res.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(res.body.errors[0].message).toContain('emailVerified');
    });
  });

  describe('API tokens', () => {
    it('lets a read-only token read drafts and every field, and leaves a full-access token unfiltered on writes, as before', async () => {
      const admin = await createAuthRequest({ strapi });
      const createToken = async (type: string) => {
        const res = await admin({
          method: 'POST',
          url: '/admin/api-tokens',
          body: { name: `${TOKEN_NAME}-${type}-${Date.now()}`, description: 'test', type },
        });

        expect(res.status).toBe(201);

        return res.body.data.accessKey as string;
      };
      const readOnly = await createToken('read-only');
      const fullAccess = await createToken('full-access');

      await strapi.documents(ARTICLE_UID).create({
        status: 'draft',
        data: { title: 'token draft', internalNotes: 'private notes' },
      });

      const drafts = await gql(
        readOnly,
        '{ articles(status: DRAFT) { documentId title internalNotes } }'
      );

      expect(drafts.statusCode).toBe(200);
      expect(drafts.body.errors).toBeUndefined();
      // The drafts of every article, private fields included
      expect(drafts.body.data.articles).toEqual(
        expect.arrayContaining([
          {
            documentId: expect.any(String),
            title: 'token draft',
            internalNotes: 'private notes',
          },
        ])
      );

      const created = await gql(
        fullAccess,
        'mutation { createNote(data: { title: "gql by token" }) { documentId title } }'
      );

      expect(created.body.errors).toBeUndefined();
      expect(created.body.data.createNote.title).toBe('gql by token');

      const updated = await gql(
        fullAccess,
        `mutation { updateNote(documentId: "${noteB.documentId}", data: { title: "gql changed" }) { documentId title } }`
      );

      expect(updated.body.errors).toBeUndefined();
      expect(updated.body.data.updateNote.title).toBe('gql changed');
    });
  });
});
