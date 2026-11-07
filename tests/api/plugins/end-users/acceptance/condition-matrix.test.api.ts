import fs from 'node:fs';
import path from 'node:path';
import { createTestBuilder } from 'api-tests/builder';
import { createRequest } from 'api-tests/request';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';
import {
  ARTICLE_UID,
  FOLDER_UID,
  NOTE_UID,
  TAG_UID,
  USER_UID,
  articleModel,
  organizationModel,
  createFixturesInstance,
  folderModel,
  noteModel,
  seedNotes,
  seoComponent,
  tagModel,
  type SeededNote,
  type SeedResult,
} from '../utils/fixtures';
import { bearer, createSignedInUser, setRolePermissions } from '../utils/permissions';

/**
 * One condition, four paths, the same entries. A caller reads notes through the REST
 * list, a REST populate, the GraphQL list and a GraphQL nested selection, and each must give what
 * the database says the caller's permission lets through, for three permission sets; then the shapes
 * the reviews of the engine found, each on its own.
 */

const PAGE_UID = 'api::page.page';
const PROFILE_UID = 'plugin::end-users.profile';
const IS_OWNER = 'plugin::end-users.is-owner';
const SHARED = 'api::shared-notes';
const ENGINE_UIDS = [
  'plugin::end-users.session',
  'plugin::end-users.account',
  'plugin::end-users.verification',
  'plugin::end-users.two-factor',
  USER_UID,
];

/** A project condition, as a project keeps it in `src/end-users/conditions/shared-notes.js` */
const SHARED_NOTES_CONDITION = {
  name: 'shared-notes',
  displayName: 'Shared notes',
  query: { shared: { $eq: true } },
};

/** A note with a one-way link to an article (a type with draft & publish) */
const matrixNoteModel = {
  ...noteModel,
  attributes: {
    ...noteModel.attributes,
    article: { type: 'relation', relation: 'oneToOne', target: ARTICLE_UID },
  },
};

/** A component whose only attribute is a one-way link to a note */
const noteRefComponent = {
  displayName: 'note-ref',
  category: 'matrix',
  attributes: { note: { type: 'relation', relation: 'oneToOne', target: NOTE_UID } },
};

/** Two links to notes, and a dynamic zone of components that link to one */
const pageModel = {
  kind: 'collectionType',
  singularName: 'page',
  pluralName: 'pages',
  displayName: 'Page',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    primary: { type: 'relation', relation: 'oneToOne', target: NOTE_UID },
    secondary: { type: 'relation', relation: 'oneToOne', target: NOTE_UID },
    blocks: { type: 'dynamiczone', components: ['matrix.note-ref'] },
  },
};

interface Row {
  action: string;
  subject: string;
  properties: Record<string, unknown>;
  conditions: Array<{ name: string; params?: Record<string, unknown> }>;
}

const row = (
  action: string,
  subject: string,
  properties: Record<string, unknown> = {},
  conditions: Row['conditions'] = []
): Row => ({ action, subject, properties, conditions });

const ownerCondition = { name: IS_OWNER, params: { field: 'owner' } };
const sharedCondition = { name: SHARED };

/** Every attribute of a note but `secret` */
const NOTE_FIELDS_WITHOUT_SECRET = ['title', 'body', 'shared', 'owner', 'folder', 'article'];

/** Find and findOne of the notes, with the same fields and conditions */
const noteRows = (conditions: Row['conditions'], properties: Record<string, unknown> = {}) => [
  row(`${NOTE_UID}.find`, NOTE_UID, properties, conditions),
  row(`${NOTE_UID}.findOne`, NOTE_UID, properties, conditions),
];

/**
 * What every permission set shares: the types a populate or a relation filter goes through. The
 * folders' read rows take the properties a test gives them (every field by default).
 */
const commonRows = (folderProperties: Record<string, unknown> = {}) => [
  ...DEFAULT_AUTHENTICATED_PERMISSIONS,
  row(`${FOLDER_UID}.find`, FOLDER_UID, folderProperties),
  row(`${FOLDER_UID}.findOne`, FOLDER_UID, folderProperties),
  row(`${ARTICLE_UID}.find`, ARTICLE_UID),
  row(`${TAG_UID}.find`, TAG_UID),
  row(`${PAGE_UID}.find`, PAGE_UID),
];

type SetName = 'owner' | 'owner-or-shared' | 'owner-hidden-secret';

const SETS: Record<SetName, Row[]> = {
  owner: noteRows([ownerCondition]),
  // One row, two conditions: either is enough
  'owner-or-shared': noteRows([ownerCondition, sharedCondition]),
  'owner-hidden-secret': noteRows([ownerCondition], { fields: NOTE_FIELDS_WITHOUT_SECRET }),
};

/** Every `documentId` anywhere in a response body */
const documentIdsIn = (body: unknown): string[] => {
  if (Array.isArray(body)) {
    return body.flatMap(documentIdsIn);
  }

  if (body === null || typeof body !== 'object') {
    return [];
  }

  return Object.entries(body).flatMap(([key, value]) =>
    key === 'documentId' && typeof value === 'string' ? [value] : documentIdsIn(value)
  );
};

const sorted = (ids: string[]) => [...ids].sort();

describe('end-users: the condition matrix', () => {
  const appDir = path.dirname(process.env.ENV_PATH as string);
  const conditionsDir = path.join(appDir, 'src', 'end-users', 'conditions');
  const conditionFile = path.join(conditionsDir, 'shared-notes.js');
  const endUsersDir = path.join(appDir, 'src', 'end-users');
  const endUsersDirExisted = fs.existsSync(endUsersDir);

  let strapi;
  let rq;
  let users: Array<{ token: string; documentId: string }>;
  let userA: { token: string; documentId: string };
  let seeded: SeedResult;
  /** The pages: what each one links to, by seeded note */
  let pages: Array<{
    documentId: string;
    primary: SeededNote;
    secondary: SeededNote;
    block: SeededNote;
  }>;

  const applySet = (rows: Row[], folderProperties: Record<string, unknown> = {}) =>
    setRolePermissions(strapi, 'authenticated', [
      ...commonRows(folderProperties),
      ...rows,
    ] as never);

  /** A request as the caller with this token, or as Public with none */
  const get = (url: string, token?: string) =>
    rq.get(url, token === undefined ? {} : { headers: bearer(token) });

  /** Every page of a REST list, 100 entries at a time */
  const pageAll = async (url: string, token?: string) => {
    const entries: Array<Record<string, any>> = [];
    const separator = url.includes('?') ? '&' : '?';

    for (let page = 1; ; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get(
        `${url}${separator}pagination[page]=${page}&pagination[pageSize]=100`,
        token
      );

      expect({ url, status: res.statusCode }).toEqual({ url, status: 200 });
      entries.push(...res.body.data);

      if (page >= res.body.meta.pagination.pageCount) {
        return entries;
      }
    }
  };

  const gqlRaw = (token: string, query: string) =>
    rq.post('/graphql', { headers: bearer(token), body: { query } });

  const gql = async (token: string, query: string) => {
    const res = await gqlRaw(token, query);

    expect({ query, errors: res.body.errors }).toEqual({ query, errors: undefined });

    return res.body.data;
  };

  /** Every page of a GraphQL list, 100 entries at a time */
  const gqlAll = async (name: string, selection: string, token: string) => {
    const entries: Array<Record<string, any>> = [];

    for (let page = 1; ; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const data = await gql(
        token,
        `{ ${name}(pagination: { page: ${page}, pageSize: 100 }) ${selection} }`
      );

      entries.push(...data[name]);

      if (data[name].length < 100) {
        return entries;
      }
    }
  };

  const documentIds = (entries: Array<Record<string, any>>) =>
    entries.map(({ documentId }) => documentId as string);

  /** The notes of populated folders, whichever path populated them */
  const flatNotes = (folders: Array<Record<string, any>>) =>
    folders.flatMap(({ notes }) => documentIds(notes ?? []));

  /** The same notes, four ways: the REST list and populate, the GraphQL list and nested selection */
  const paths = {
    restList: async (token: string) =>
      documentIds(await pageAll('/api/notes?fields[0]=documentId', token)),
    restPopulate: async (token: string) =>
      flatNotes(await pageAll('/api/folders?populate[notes][fields][0]=documentId', token)),
    gqlList: async (token: string) => documentIds(await gqlAll('notes', '{ documentId }', token)),
    gqlNested: async (token: string) =>
      flatNotes(
        await gqlAll('folders', '{ notes(pagination: { limit: 1000 }) { documentId } }', token)
      ),
  };

  /** What the database says a set lets the caller read: the same filters through the Document Service */
  const dbTruth = async (set: SetName, caller: { documentId: string }) => {
    const owned = { owner: { documentId: caller.documentId } };
    const filters = set === 'owner-or-shared' ? { $or: [owned, { shared: true }] } : owned;
    const notes = await strapi
      .documents(NOTE_UID)
      .findMany({ filters, fields: ['documentId'], limit: -1 });

    return documentIds(notes);
  };

  /** What the seed says a caller may read under `owner-or-shared` */
  const visibleToA = (note: SeededNote) => note.owner === userA.documentId || note.shared;

  const emptyTables = async () => {
    for (const uid of [PAGE_UID, NOTE_UID, FOLDER_UID, ARTICLE_UID, TAG_UID, PROFILE_UID]) {
      // eslint-disable-next-line no-await-in-loop
      await strapi.db.query(uid).deleteMany({ where: {} });
    }

    for (const uid of ENGINE_UIDS) {
      // eslint-disable-next-line no-await-in-loop
      await strapi.db.query(uid).deleteMany({ where: {} });
    }
  };

  beforeAll(async () => {
    // The project's condition is read when the app loads, so it is there before the instance starts
    fs.mkdirSync(conditionsDir, { recursive: true });
    fs.writeFileSync(
      conditionFile,
      `module.exports = ${JSON.stringify(SHARED_NOTES_CONDITION, null, 2)};\n`
    );

    strapi = await createFixturesInstance({
      builder: createTestBuilder()
        .addComponent(seoComponent)
        // Each type after the ones it points at
        .addContentTypes([tagModel, organizationModel, folderModel, articleModel, matrixNoteModel])
        .addComponent(noteRefComponent)
        .addContentType(pageModel),
    });
    rq = createRequest({ strapi });

    await emptyTables();
    await setRolePermissions(strapi, 'public', []);

    users = [];

    for (let index = 1; index <= 5; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      users.push(await createSignedInUser(rq, `matrix-${index}@example.com`));
    }

    [userA] = users;

    seeded = await seedNotes(strapi, {
      users: users.map(({ documentId }) => documentId),
      folders: 20,
      notes: 500,
      seed: 42,
    });

    // Without both kinds of note the matrix proves nothing: A's own, and shared ones of others
    expect(seeded.notes.some((note) => note.owner === userA.documentId)).toBe(true);
    expect(seeded.notes.some((note) => note.owner !== userA.documentId && note.shared)).toBe(true);
    expect(seeded.notes.some((note) => note.owner !== userA.documentId && !note.shared)).toBe(true);

    // Pages that link to notes of every owner, in a pattern the seed fixes
    const pick = (index: number) => seeded.notes[index % seeded.notes.length];

    pages = [];

    for (let index = 1; index <= 60; index += 1) {
      const [primary, secondary, block] = [pick(index * 7), pick(index * 11), pick(index * 13)];
      // eslint-disable-next-line no-await-in-loop
      const { documentId } = await strapi.documents(PAGE_UID).create({
        data: {
          title: `page ${index}`,
          primary: { connect: [{ documentId: primary.documentId }] },
          secondary: { connect: [{ documentId: secondary.documentId }] },
          blocks: [
            {
              __component: 'matrix.note-ref',
              note: { connect: [{ documentId: block.documentId }] },
            },
          ],
        },
      });

      pages.push({ documentId, primary, secondary, block });
    }
  });

  afterAll(async () => {
    await emptyTables();
    await setRolePermissions(strapi, 'public', []);
    await setRolePermissions(strapi, 'authenticated', [...DEFAULT_AUTHENTICATED_PERMISSIONS]);
    await strapi.destroy();

    // Only what this wrote: the whole folder when it was not there before, the file when it was
    if (endUsersDirExisted) {
      fs.rmSync(conditionFile, { force: true });
    } else {
      fs.rmSync(endUsersDir, { recursive: true, force: true });
    }
  });

  describe('four paths, one answer', () => {
    it.each(['owner', 'owner-or-shared', 'owner-hidden-secret'] as SetName[])(
      'gives the same notes on all four paths (%s)',
      async (set) => {
        await applySet(SETS[set]);

        const expected = await dbTruth(set, userA);

        // The matrix is only worth something when the set lets some notes through and holds some back
        expect(expected.length).toBeGreaterThan(0);
        expect(expected.length).toBeLessThan(seeded.notes.length);

        for (const [name, read] of Object.entries(paths)) {
          // eslint-disable-next-line no-await-in-loop
          const ids = await read(userA.token);

          expect({ path: name, ids: sorted(ids) }).toEqual({ path: name, ids: sorted(expected) });
        }
      }
    );

    it('gives each caller their own notes, whoever else is signed in', async () => {
      await applySet(SETS.owner);

      for (const user of users.slice(1, 3)) {
        // eslint-disable-next-line no-await-in-loop
        const expected = await dbTruth('owner', user);
        // eslint-disable-next-line no-await-in-loop
        const ids = await paths.restList(user.token);

        expect(sorted(ids)).toEqual(sorted(expected));
      }
    });

    it('reports the same total on REST meta and GraphQL pageInfo', async () => {
      for (const set of ['owner', 'owner-or-shared'] as SetName[]) {
        // eslint-disable-next-line no-await-in-loop
        await applySet(SETS[set]);

        // eslint-disable-next-line no-await-in-loop
        const expected = (await dbTruth(set, userA)).length;
        // eslint-disable-next-line no-await-in-loop
        const rest = await get('/api/notes?pagination[pageSize]=1', userA.token);
        // eslint-disable-next-line no-await-in-loop
        const graphql = await gql(
          userA.token,
          '{ notes_connection(pagination: { page: 1, pageSize: 1 }) { pageInfo { total } } }'
        );

        expect({
          set,
          rest: rest.body.meta.pagination.total,
          graphql: graphql.notes_connection.pageInfo.total,
        }).toEqual({ set, rest: expected, graphql: expected });
      }
    });

    it('never returns secret on any path under owner-hidden-secret', async () => {
      await applySet(SETS['owner-hidden-secret']);

      const secrets = seeded.notes.map(({ secret }) => secret);
      const hasSecret = (entries: Array<Record<string, any>>) =>
        entries.filter((entry) => entry.secret !== undefined && entry.secret !== null);

      const restList = await pageAll('/api/notes', userA.token);
      const restPopulate = (await pageAll('/api/folders?populate=notes', userA.token)).flatMap(
        ({ notes }) => notes
      );
      const gqlList = await gqlAll('notes', '{ documentId secret }', userA.token);
      const gqlNested = (
        await gqlAll(
          'folders',
          '{ notes(pagination: { limit: 1000 }) { documentId secret } }',
          userA.token
        )
      ).flatMap(({ notes }) => notes);

      expect(restList.length).toBeGreaterThan(0);
      expect(gqlList.length).toBeGreaterThan(0);

      for (const [name, entries] of Object.entries({
        restList,
        restPopulate,
        gqlList,
        gqlNested,
      })) {
        expect({ path: name, withSecret: hasSecret(entries) }).toEqual({
          path: name,
          withSecret: [],
        });
      }

      // And asking for it by name, on REST, answers a refusal or an entry without it: never its value
      const asked = await get('/api/notes?fields[0]=secret', userA.token);

      expect(secrets.some((secret) => JSON.stringify(asked.body).includes(`"${secret}"`))).toBe(
        false
      );
    });
  });

  describe('what a caller can try against an is-owner condition', () => {
    let userB: { token: string; documentId: string };

    const ownedBy = (user: { documentId: string }) =>
      seeded.notes.filter((note) => note.owner === user.documentId);
    const hiddenFromA = () =>
      new Set(
        seeded.notes
          .filter((note) => note.owner !== userA.documentId)
          .map(({ documentId }) => documentId)
      );

    beforeAll(async () => {
      [, userB] = users;

      // A may also read every user, so a caller's own `filters[owner]` survives the stock sanitizer:
      // the worst case
      await applySet([...SETS.owner, row(`${USER_UID}.find`, USER_UID)]);
    });

    it("answers 404 for someone else's note, and gives Public an empty list under an is-owner rule", async () => {
      const [mine] = ownedBy(userA);
      const theirs = seeded.notes.find((note) => note.owner !== userA.documentId) as SeededNote;

      expect((await get(`/api/notes/${mine.documentId}`, userA.token)).statusCode).toBe(200);
      expect((await get(`/api/notes/${theirs.documentId}`, userA.token)).statusCode).toBe(404);

      await setRolePermissions(strapi, 'public', [
        row(`${NOTE_UID}.find`, NOTE_UID, {}, [ownerCondition]),
        row(`${FOLDER_UID}.find`, FOLDER_UID),
      ]);

      try {
        const res = await get('/api/notes');

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.meta.pagination.total).toBe(0);

        // Folders are open to Public; the notes in them are not, through populate or a filter
        const folders = await pageAll('/api/folders?populate=notes');

        expect(folders).toHaveLength(seeded.folders.length);
        expect(folders.every(({ notes }) => notes.length === 0)).toBe(true);
        expect((await get('/api/folders?filters[notes][id][$notNull]=true')).body.data).toEqual([]);
      } finally {
        await setRolePermissions(strapi, 'public', []);
      }
    });

    it("holds against the filters and populates a caller can try to reach other users' notes", async () => {
      const hidden = hiddenFromA();

      for (const template of [
        '/api/notes?filters[owner][documentId][$eq]=<B>',
        '/api/notes?filters[owner][documentId][$ne]=<A>',
        '/api/notes?filters[$or][0][owner][documentId]=<B>',
        '/api/folders?populate[notes][filters][owner][documentId]=<B>',
        '/api/folders?populate=*',
        '/api/folders?populate=notes',
        '/api/folders?populate[0]=notes',
        '/api/folders?populate[notes]=true',
        '/api/notes?populate[folder][populate][notes]=true',
        '/api/notes?populate=folder.notes',
      ]) {
        const url = template.replace('<A>', userA.documentId).replace('<B>', userB.documentId);
        // eslint-disable-next-line no-await-in-loop
        const res = await get(
          `${url}${url.includes('?') ? '&' : '?'}pagination[pageSize]=100`,
          userA.token
        );

        // The URL rides inside the asserted objects, so a failure names it
        expect({ template, status: res.statusCode }).toEqual({ template, status: 200 });
        expect({
          template,
          leaked: documentIdsIn(res.body.data).filter((id) => hidden.has(id)),
        }).toEqual({ template, leaked: [] });
      }

      // A caller filter that asks for someone else's notes gives no entry
      const asked = await get(
        `/api/notes?filters[owner][documentId][$eq]=${userB.documentId}`,
        userA.token
      );

      expect(asked.body.data).toEqual([]);
      expect(asked.body.meta.pagination.total).toBe(0);
    });

    it('closes the relation-filter oracle', async () => {
      const theirs = seeded.notes.find((note) => note.owner !== userA.documentId) as SeededNote;
      const byTitle = await get(
        `/api/folders?filters[notes][title][$eq]=${encodeURIComponent(theirs.title)}`,
        userA.token
      );

      expect(byTitle.statusCode).toBe(200);
      expect(byTitle.body.data).toHaveLength(0);

      // A prefix matches only the folders that hold one of A's notes with that prefix
      const prefix = theirs.title.split(' ')[0];
      const expected = new Set(
        ownedBy(userA)
          .filter((note) => note.title.startsWith(prefix))
          .map((note) => note.folder)
      );
      const data = await pageAll(
        `/api/folders?filters[notes][title][$startsWith]=${encodeURIComponent(prefix)}`,
        userA.token
      );

      expect(new Set(data.map((folder) => folder.documentId))).toEqual(expected);

      // Through the owner, and back through the folder
      expect(
        (
          await get(
            `/api/folders?filters[notes][owner][documentId][$eq]=${userB.documentId}`,
            userA.token
          )
        ).body.data
      ).toEqual([]);
      expect(
        (
          await get(
            `/api/notes?filters[folder][notes][title][$eq]=${encodeURIComponent(theirs.title)}`,
            userA.token
          )
        ).body.data
      ).toEqual([]);
    });

    // `$not` is applied to each LEFT JOIN row, so another user's note rows would come out true under it
    it('refuses a $not above notes, so it never lists the folders holding other users` notes, and keeps one over unconditioned folders and the fields of notes', async () => {
      const res = await get('/api/folders?filters[$not][notes][id][$notNull]=true', userA.token);

      expect(res.statusCode).toBe(400);
      expect(res.body.data ?? null).toBeNull();
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        details: { key: 'notes', path: 'notes', source: 'query', param: 'filters' },
      });

      const nested = await get(
        `/api/notes?filters[$or][0][$not][folder][notes][owner][documentId][$eq]=${userB.documentId}`,
        userA.token
      );

      expect(nested.statusCode).toBe(400);
      expect(nested.body.error.details).toMatchObject({
        key: 'notes',
        path: 'folder.notes',
        param: 'filters',
      });

      const populated = await get(
        '/api/notes?populate[folder][filters][$not][notes][id][$notNull]=true',
        userA.token
      );

      expect(populated.statusCode).toBe(400);
      expect(populated.body.error.details).toMatchObject({
        key: 'notes',
        path: 'folder.notes',
        param: 'populate',
      });

      // A `$not` over the fields of notes, and over folders nothing hides, is still applied
      const [mine] = ownedBy(userA);
      const owned = new Set(ownedBy(userA).map(({ documentId }) => documentId));
      const data = await pageAll(
        `/api/notes?filters[$not][title][$eq]=${encodeURIComponent(mine.title)}`,
        userA.token
      );

      expect(data.length).toBeGreaterThan(0);
      expect(data.every((note) => owned.has(note.documentId))).toBe(true);
      expect(data.some((note) => note.documentId === mine.documentId)).toBe(false);

      const byFolder = await get('/api/notes?filters[$not][folder][name][$null]=true', userA.token);

      expect(byFolder.statusCode).toBe(200);
      expect(documentIdsIn(byFolder.body.data).filter((id) => hiddenFromA().has(id))).toEqual([]);
    });

    it('answers 400 to a sort through notes, on folders and inside populate', async () => {
      const onFolders = await get('/api/folders?sort=notes.title', userA.token);

      expect(onFolders.statusCode).toBe(400);
      expect(onFolders.body.error).toMatchObject({
        name: 'ValidationError',
        details: { key: 'notes', path: 'notes', source: 'query', param: 'sort' },
      });

      const inPopulate = await get('/api/notes?populate[folder][sort]=notes.title', userA.token);

      expect(inPopulate.statusCode).toBe(400);
      expect(inPopulate.body.error).toMatchObject({
        name: 'ValidationError',
        details: { key: 'notes', path: 'folder.notes', param: 'populate' },
      });
    });

    it("counts only the visible related notes, and populates only the caller's notes of each folder", async () => {
      const counted = await pageAll('/api/folders?populate[notes][count]=true', userA.token);

      expect(counted).toHaveLength(seeded.folders.length);

      for (const folder of counted) {
        const share = ownedBy(userA).filter((note) => note.folder === folder.documentId);

        expect(folder.notes).toEqual({ count: share.length });
      }

      const populated = await pageAll('/api/folders?populate[notes][fields][0]=title', userA.token);

      for (const folder of populated) {
        const share = ownedBy(userA)
          .filter((note) => note.folder === folder.documentId)
          .map((note) => note.documentId)
          .sort();

        expect(folder.notes.map((note) => note.documentId).sort()).toEqual(share);
      }
    });
  });

  describe('the shapes the reviews found', () => {
    beforeAll(() => applySet(SETS['owner-or-shared']));

    it('refuses a $not over a conditioned relation, which would list folders holding unreadable notes', async () => {
      const res = await get(
        '/api/folders?filters[$not][notes][title][$startsWith]=alpha',
        userA.token
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');

      const graphql = await gqlRaw(
        userA.token,
        '{ folders(filters: { not: { notes: { title: { startsWith: "alpha" } } } }) { documentId } }'
      );

      expect(graphql.body.errors?.length).toBeGreaterThan(0);
    });

    it('applies the condition to two conditioned relation filters side by side', async () => {
      // primary is shared (readable by anyone), secondary is not shared: only A's own count
      const expected = pages
        .filter(
          ({ primary, secondary }) =>
            visibleToA(primary) && primary.shared && visibleToA(secondary) && !secondary.shared
        )
        .map(({ documentId }) => documentId);
      const entries = await pageAll(
        '/api/pages?filters[primary][shared][$eq]=true&filters[secondary][shared][$eq]=false',
        userA.token
      );

      expect(sorted(documentIds(entries))).toEqual(sorted(expected));
    });

    it('applies the condition through a dotted populate of a dynamic zone', async () => {
      const entries = await pageAll('/api/pages?populate[0]=blocks.note', userA.token);
      const returned = entries.flatMap(({ blocks }) =>
        (blocks ?? [])
          .map(({ note }) => note?.documentId as string | undefined)
          .filter((id): id is string => typeof id === 'string')
      );
      const expected = pages
        .filter(({ block }) => visibleToA(block))
        .map(({ block }) => block.documentId);

      expect(returned.length).toBeGreaterThan(0);
      expect(sorted(returned)).toEqual(sorted(expected));
    });

    it('applies the condition through the wildcard populate of a dynamic zone', async () => {
      const entries = await pageAll('/api/pages?populate[blocks][populate]=*', userA.token);
      const returned = entries.flatMap(({ blocks }) =>
        (blocks ?? [])
          .map(({ note }) => note?.documentId as string | undefined)
          .filter((id): id is string => typeof id === 'string')
      );
      const hidden = new Set(
        seeded.notes.filter((note) => !visibleToA(note)).map(({ documentId }) => documentId)
      );

      expect(returned.filter((id) => hidden.has(id))).toEqual([]);
    });

    it('shows a relation filter into a type with draft & publish only its published versions', async () => {
      const published = await strapi.documents(ARTICLE_UID).create({
        status: 'published',
        data: { title: 'matrix published article' },
      });
      const draft = await strapi.documents(ARTICLE_UID).create({
        status: 'draft',
        data: { title: 'matrix draft-only article' },
      });
      const own = seeded.notes.filter((note) => note.owner === userA.documentId).slice(0, 2);

      await strapi.documents(NOTE_UID).update({
        documentId: own[0].documentId,
        data: { article: { connect: [{ documentId: published.documentId }] } },
      });
      await strapi.documents(NOTE_UID).update({
        documentId: own[1].documentId,
        data: { article: { connect: [{ documentId: draft.documentId }] } },
      });

      // A holds `find` on articles and no `read-drafts`: an article that was never published says
      // nothing about its notes, through a filter either
      const byDraftTitle = await get(
        `/api/notes?filters[article][title][$eq]=${encodeURIComponent('matrix draft-only article')}`,
        userA.token
      );

      expect(byDraftTitle.statusCode).toBe(200);
      expect(byDraftTitle.body.data).toEqual([]);
      expect(byDraftTitle.body.meta.pagination.total).toBe(0);

      const byPublishedTitle = await get(
        `/api/notes?filters[article][title][$eq]=${encodeURIComponent('matrix published article')}`,
        userA.token
      );

      expect(byPublishedTitle.statusCode).toBe(200);
      expect(
        byPublishedTitle.body.data.every(({ documentId }) => documentId === own[0].documentId)
      ).toBe(true);
    });

    it('gives each entry the fields of the rows it matches (per-entry field groups)', async () => {
      // The owner's rows give every field; a shared note of someone else gives its title only. A
      // role holds one row per action and subject, so the second rows are a second role's, which
      // user A holds as well (several roles per user, access is the union)
      await applySet(noteRows([ownerCondition]));

      const roles = strapi.plugin('end-users').service('role');
      const titles = await roles.create({ name: `Shared titles ${Date.now()}` });

      await strapi
        .plugin('end-users')
        .service('permission')
        .applyDiff(titles.documentId, {
          create: noteRows([sharedCondition], { fields: ['title'] }),
          update: [],
          delete: [],
        });
      await strapi.documents(USER_UID).update({
        documentId: userA.documentId,
        data: { roles: { connect: [titles.documentId] } },
      });

      try {
        const bySeed = new Map(seeded.notes.map((note) => [note.documentId, note]));
        const rest = await pageAll('/api/notes', userA.token);
        const graphql = await gqlAll('notes', '{ documentId title secret }', userA.token);

        expect(rest.length).toBeGreaterThan(0);
        expect(sorted(documentIds(graphql))).toEqual(sorted(documentIds(rest)));

        for (const entry of rest) {
          const note = bySeed.get(entry.documentId) as SeededNote;

          expect({ id: entry.documentId, secret: entry.secret }).toEqual({
            id: entry.documentId,
            secret: note.owner === userA.documentId ? note.secret : undefined,
          });
        }

        for (const entry of graphql) {
          const note = bySeed.get(entry.documentId) as SeededNote;

          expect({ id: entry.documentId, secret: entry.secret ?? null }).toEqual({
            id: entry.documentId,
            secret: note.owner === userA.documentId ? note.secret : null,
          });
        }
      } finally {
        await strapi.documents(USER_UID).update({
          documentId: userA.documentId,
          data: { roles: { disconnect: [titles.documentId] } },
        });
        await roles.delete(titles.documentId);
        await applySet(SETS['owner-or-shared']);
      }
    });

    it('answers an empty list for a nested to-many selection the parent type hides on GraphQL', async () => {
      // The folders list `name` only: their `notes` is hidden from this caller. A to-many relation
      // is a non-null list, so it answers [] (a null would null each folder)
      await applySet(SETS['owner-or-shared'], { fields: ['name'] });

      try {
        const data = await gql(
          userA.token,
          '{ folders(pagination: { limit: 100 }) { documentId name notes { documentId } } }'
        );

        expect(data.folders.length).toBeGreaterThan(0);
        expect(data.folders.every(({ name }) => typeof name === 'string')).toBe(true);
        expect(data.folders.map(({ notes }) => notes)).toEqual(data.folders.map(() => []));
      } finally {
        await applySet(SETS['owner-or-shared']);
      }
    });
  });
});
