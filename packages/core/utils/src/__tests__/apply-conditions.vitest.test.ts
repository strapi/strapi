import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneDeep } from 'lodash';

import {
  DENY_ALL_FILTER,
  type ExplainEntry,
  type PermissionChecker,
} from '../content-api-permissions';
import { ValidationError } from '../errors';
import { applyConditions } from '../sanitize/apply-conditions';
import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import type { Model } from '../types';

const USER = 'plugin::end-users.user';
const NOTE = 'api::note.note';
const FOLDER = 'api::folder.folder';
const FILE = 'plugin::upload.file';
const LINKS = 'shared.links';
const ITEM = 'api::item.item';
const BOARD = 'api::board.board';

const user = {
  uid: USER,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  options: {},
  attributes: { name: { type: 'string' } },
} satisfies Model;

const note = {
  uid: NOTE,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: {},
  attributes: {
    title: { type: 'string' },
    tenant: { type: 'string', private: true },
    owner: { type: 'relation', relation: 'manyToOne', target: USER },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER, inversedBy: 'notes' },
  },
} satisfies Model;

const folder = {
  uid: FOLDER,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'folder', pluralName: 'folders', displayName: 'Folder' },
  options: {},
  attributes: {
    name: { type: 'string' },
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE, mappedBy: 'folder' },
    cover: { type: 'media', multiple: false },
    links: { type: 'component', component: LINKS, repeatable: false },
    blocks: { type: 'dynamiczone', components: [LINKS] },
    pinned: { type: 'relation', relation: 'morphToMany' },
  },
} satisfies Model;

const links = {
  uid: LINKS,
  modelType: 'component' as const,
  info: { displayName: 'links' },
  options: {},
  attributes: {
    label: { type: 'string' },
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE },
  },
} satisfies Model;

const file = {
  uid: FILE,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'file', pluralName: 'files', displayName: 'File' },
  options: {},
  attributes: {
    name: { type: 'string' },
    related: { type: 'relation', relation: 'morphToMany' },
  },
} satisfies Model;

/** A type with a scalar attribute named like a populate option, `populate` */
const item = {
  uid: ITEM,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'item', pluralName: 'items', displayName: 'Item' },
  options: {},
  attributes: {
    populate: { type: 'string' },
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER },
  },
} satisfies Model;

/** An owner of a morph relation and a dynamic zone with a scalar attribute named `on` */
const board = {
  uid: BOARD,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'board', pluralName: 'boards', displayName: 'Board' },
  options: {},
  attributes: {
    on: { type: 'boolean' },
    items: { type: 'relation', relation: 'oneToMany', target: ITEM },
    pinned: { type: 'relation', relation: 'morphToMany' },
    blocks: { type: 'dynamiczone', components: [LINKS] },
  },
} satisfies Model;

const models: Record<string, Model> = {
  [USER]: user,
  [NOTE]: note,
  [FOLDER]: folder,
  [LINKS]: links,
  [FILE]: file,
  [ITEM]: item,
  [BOARD]: board,
};
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

/** What the checker hands out for the caller's `find` rows on notes */
const OWNED_BY_A = { owner: { documentId: { $eq: 'A' } } };

/** What a relation filter's condition comes with: the related entry must exist (not a LEFT JOIN null) */
const EXISTS = { id: { $notNull: true } };

/** What a `$not` above a conditioned relation gets: true of every row, so the `$not` matches none */
const EVERY_ROW = { $or: [{ id: { $null: true } }, { id: { $notNull: true } }] };

type Answers = Record<string, Record<string, unknown> | null>;

interface FakeChecker extends PermissionChecker {
  asked: Array<[string, string]>;
  recorded: ExplainEntry[];
}

/**
 * An active checker whose `filtersFor` answers from `answers` (by uid; `{}` for a uid it doesn't
 * list), with a fresh copy each time, as the real one does.
 */
const fakeChecker = (answers: Answers = { [NOTE]: OWNED_BY_A }): FakeChecker => {
  const asked: Array<[string, string]> = [];
  const recorded: ExplainEntry[] = [];

  return {
    asked,
    recorded,
    isActive: () => true,
    filtersFor(_auth, action, uid) {
      asked.push([action, uid]);

      return uid in answers ? cloneDeep(answers[uid]) : {};
    },
    canReadDrafts: () => true,
    fieldsFor: () => ({ always: null, conditional: [] }),
    readableFields: () => null,
    writableFields: () => null,
    lockedFields: () => [],
    stampFor: () => ({}),
    populateDepth: () => null,
    record(_auth, entry) {
      recorded.push(entry);
    },
  };
};

const createAPI = (checker: PermissionChecker = fakeChecker()) => ({
  checker,
  sanitize: createAPISanitizers({ getModel, permissions: checker }),
  validate: createAPIValidators({ getModel, permissions: checker }),
});

const find = { auth, action: 'find' };

/**
 * Every populate node that loads notes: the value of a `notes` key, and the note fragment of a
 * morph `on`, wherever they sit in the populate tree.
 */
const notesNodes = (populate: unknown): unknown[] => {
  if (Array.isArray(populate)) {
    return populate.flatMap(notesNodes);
  }

  if (populate === null || typeof populate !== 'object') {
    return [];
  }

  return Object.entries(populate).flatMap(([key, value]) =>
    key === 'notes' || key === NOTE ? [value, ...notesNodes(value)] : notesNodes(value)
  );
};

beforeEach(() => {
  // The stock relation visitors ask `strapi.auth.verify` whether the caller may read the target,
  // and a morph populate lists the content types
  (globalThis as unknown as { strapi: unknown }).strapi = {
    contentTypes: { [USER]: user, [NOTE]: note, [FOLDER]: folder, [FILE]: file },
    components: { [LINKS]: links },
    getModel,
    auth: { verify: () => true },
  };
});

describe('applyConditions: the root filters', () => {
  it('ANDs the condition with caller filters instead of merging keys', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: { owner: { documentId: { $eq: 'B' } } } },
      note,
      find
    );

    expect(q.filters).toEqual({ $and: [{ owner: { documentId: { $eq: 'B' } } }, OWNED_BY_A] });
  });

  it('uses the condition alone when the caller sends no filters', async () => {
    const { sanitize } = createAPI();

    expect((await sanitize.query({}, note, find)).filters).toEqual(OWNED_BY_A);
    // Filters the sanitizer emptied count as none
    expect((await sanitize.query({ filters: { nope: 1 } }, note, find)).filters).toEqual(
      OWNED_BY_A
    );
  });

  it("uses the deny filter when every condition of the caller's row fails", async () => {
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: null }));

    const alone = await sanitize.query({}, note, find);
    const anded = await sanitize.query({ filters: { title: { $eq: 'x' } } }, note, find);

    expect(alone.filters).toEqual(DENY_ALL_FILTER);
    expect(alone.filters).not.toBe(DENY_ALL_FILTER);
    expect(Object.isFrozen(alone.filters)).toBe(false);
    expect(anded.filters).toEqual({ $and: [{ title: { $eq: 'x' } }, DENY_ALL_FILTER] });
  });

  it('leaves the root untouched for a uid the caller holds no row for', async () => {
    const { sanitize, checker } = createAPI(fakeChecker({}));

    expect(await sanitize.query({ filters: { title: { $eq: 'x' } } }, note, find)).toEqual({
      filters: { title: { $eq: 'x' } },
    });
    expect(await sanitize.query({}, note, find)).toEqual({});
    expect((checker as FakeChecker).asked).toEqual([
      ['find', NOTE],
      ['find', NOTE],
    ]);
  });

  it('reads the root with the read action for reads and relations with find', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);

    await sanitize.query({ populate: { folder: true } }, note, { auth, action: 'findOne' });
    await sanitize.query({}, note, { auth, action: 'create' });
    await sanitize.query({}, note, { auth, action: 'me' });
    await sanitize.query({}, note, { auth });

    expect(checker.asked).toEqual([
      ['findOne', NOTE],
      ['find', FOLDER],
      ['findOne', NOTE],
      ['find', NOTE],
      ['find', NOTE],
    ]);
  });

  it("narrows update and delete by their own rules, not the read action's", async () => {
    const mayUpdate = { owner: { documentId: { $eq: 'A' } } };
    const mayDelete = { title: { $eq: 'draft' } };
    const checker = fakeChecker({ [NOTE]: OWNED_BY_A });

    checker.filtersFor = (_auth, action, uid) => {
      checker.asked.push([action, uid]);

      if (uid !== NOTE) {
        return {};
      }

      return cloneDeep({ update: mayUpdate, delete: mayDelete }[action] ?? OWNED_BY_A);
    };

    const { sanitize } = createAPI(checker);
    const filters = { title: { $eq: 'x' } };

    expect((await sanitize.query({ filters }, note, { auth, action: 'update' })).filters).toEqual({
      $and: [filters, mayUpdate],
    });
    expect((await sanitize.query({ filters }, note, { auth, action: 'delete' })).filters).toEqual({
      $and: [filters, mayDelete],
    });
    // Relations a write populates are still read with find
    await sanitize.query({ populate: { folder: true } }, note, { auth, action: 'delete' });

    expect(checker.asked).toEqual([
      ['update', NOTE],
      ['delete', NOTE],
      ['delete', NOTE],
      ['find', FOLDER],
    ]);
  });

  it('denies an update or delete whose own rows all deny, whatever find allows', async () => {
    const checker = fakeChecker({ [NOTE]: OWNED_BY_A });

    checker.filtersFor = (_auth, action) => (action === 'delete' ? null : cloneDeep(OWNED_BY_A));

    const { sanitize } = createAPI(checker);

    expect((await sanitize.query({}, note, { auth, action: 'delete' })).filters).toEqual(
      DENY_ALL_FILTER
    );
    expect((await sanitize.query({}, note, { auth, action: 'find' })).filters).toEqual(OWNED_BY_A);
  });

  it('reads null root filters as none', async () => {
    const checker = fakeChecker();

    const q = await applyConditions({ filters: null }, note, {
      auth,
      action: 'find',
      checker,
      getModel,
    });

    expect(q.filters).toEqual(OWNED_BY_A);
  });

  it('flattens a list of root filters into the $and', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: [{ title: { $eq: 'a' } }, { title: { $ne: 'b' } }] },
      note,
      find
    );

    expect(q.filters).toEqual({
      $and: [{ title: { $eq: 'a' } }, { title: { $ne: 'b' } }, OWNED_BY_A],
    });
  });

  it('refuses root filters that are not an object or a list', async () => {
    const checker = fakeChecker();

    await expect(
      applyConditions({ filters: 'x' }, note, { auth, checker, getModel })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('applyConditions: condition filters are never sanitized', () => {
  it('keeps a condition on a private field and an empty $in after the caller is sanitized', async () => {
    const condition = { $or: [{ tenant: { $eq: 't1' } }, { title: { $in: [] } }] };
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: condition }));

    const q = await sanitize.query(
      // The caller's own filter on the private field is removed; the condition's stays
      { filters: { tenant: { $eq: 't2' }, title: { $eq: 'x' } } },
      note,
      find
    );

    expect(q.filters).toEqual({ $and: [{ title: { $eq: 'x' } }, condition] });
  });

  it('keeps an empty $in in a condition: it never becomes match-all', async () => {
    const condition = { title: { $in: [] } };
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: condition }));

    expect((await sanitize.query({}, note, find)).filters).toEqual({ title: { $in: [] } });
    expect(
      (await sanitize.query({ filters: { notes: { title: { $eq: 'x' } } } }, folder, find)).filters
    ).toEqual({ notes: { $and: [{ title: { $eq: 'x' } }, { title: { $in: [] } }, EXISTS] } });
  });

  it('does not condition the relations inside a condition, even to a conditioned type', async () => {
    // The note's condition goes through folder, and folder is conditioned too
    const noteCondition = { folder: { name: { $eq: 'mine' } } };
    const folderCondition = { name: { $eq: 'mine' } };
    const { sanitize } = createAPI(
      fakeChecker({ [NOTE]: noteCondition, [FOLDER]: folderCondition })
    );

    const q = await sanitize.query({ filters: { notes: { title: { $eq: 'x' } } } }, folder, find);

    expect(q.filters).toEqual({
      $and: [
        { notes: { $and: [{ title: { $eq: 'x' } }, noteCondition, EXISTS] } },
        folderCondition,
      ],
    });
  });
});

describe('applyConditions: populate', () => {
  it.each<[string, unknown]>([
    ['*', '*'],
    ['a string', 'notes'],
    ['a list', ['notes']],
    ['a comma string', 'links,notes'],
    ['a comma list', ['links,notes']],
    ['true', { notes: true }],
    ["'true'", { notes: 'true' }],
    ['any other string', { notes: 'title' }],
    ['a nested list', { notes: { populate: { folder: { populate: ['notes'] } } } }],
    ['a nested comma string', { links: { populate: 'notes,label' } }],
    ['a component', { links: { populate: { notes: true } } }],
    ['a dynamic zone fragment', { blocks: { on: { [LINKS]: { populate: { notes: true } } } } }],
    ['a dynamic zone wildcard', { blocks: { populate: '*' } }],
    ['a dotted path through a dynamic zone', 'blocks.notes'],
    ['a dotted path through a dynamic zone in a list', ['links', 'blocks.notes']],
    ['a morph fragment', { pinned: { on: { [NOTE]: true, [FOLDER]: true } } }],
    ['a morph true', { pinned: true }],
    ['a count', { notes: { count: 'true' } }],
    ['a nested * under a relation', { notes: { populate: { folder: { populate: '*' } } } }],
    ['a nested * under a component', { links: { populate: '*' } }],
    ['a nested * under a morph fragment', { pinned: { on: { [FOLDER]: { populate: '*' } } } }],
  ])('conditions every notes node for populate as %s', async (_name, populate) => {
    const { sanitize } = createAPI();

    const q = await sanitize.query({ populate }, folder, find);
    const nodes = notesNodes(q.populate);

    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(node).toMatchObject({ filters: OWNED_BY_A });
    }
  });

  it('conditions both notes nodes of a nested populate', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { populate: { notes: { populate: { folder: { populate: ['notes'] } } } } },
      folder,
      find
    );

    expect(q.populate).toEqual({
      notes: {
        filters: OWNED_BY_A,
        populate: { folder: { populate: { notes: { filters: OWNED_BY_A } } } },
      },
    });
  });

  it('expands a nested * under a relation and under a component before conditioning it', async () => {
    const { sanitize } = createAPI();

    // The query params converter reads a nested `*` as every relation of the target, unfiltered
    const underRelation = await sanitize.query(
      { populate: { folder: { populate: '*' } } },
      note,
      find
    );
    const underComponent = await sanitize.query(
      { populate: { links: { populate: '*' } } },
      folder,
      find
    );

    expect(underRelation.populate).toMatchObject({
      folder: {
        populate: {
          notes: { filters: OWNED_BY_A },
          cover: true,
          links: true,
          blocks: true,
          pinned: { on: { [NOTE]: { filters: OWNED_BY_A }, [FOLDER]: true } },
        },
      },
    });
    expect(underComponent.populate).toEqual({
      links: { populate: { notes: { filters: OWNED_BY_A } } },
    });

    // applyConditions on its own, without the stock steps before it, expands them too, and removes
    // the morph relation it can't attach a condition to
    const ctx = { auth, action: 'find', checker: fakeChecker(), getModel };

    expect(
      (await applyConditions({ populate: { folder: { populate: '*' } } }, note, ctx)).populate
    ).toEqual({
      folder: {
        populate: { notes: { filters: OWNED_BY_A }, cover: true, links: true, blocks: true },
      },
    });
    expect(
      (await applyConditions({ populate: { links: { populate: '*' } } }, folder, ctx)).populate
    ).toEqual({ links: { populate: { notes: { filters: OWNED_BY_A } } } });
  });

  it("ANDs the condition with a populate node's own filters", async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      {
        populate: {
          notes: { filters: { owner: { documentId: { $eq: 'B' } } }, fields: ['title'] },
        },
      },
      folder,
      find
    );

    expect(q.populate).toEqual({
      notes: {
        filters: { $and: [{ owner: { documentId: { $eq: 'B' } } }, OWNED_BY_A] },
        fields: ['title'],
      },
    });
  });

  it('leaves a relation the caller does not populate, and media, as they are', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query({ populate: { notes: 'false', cover: true } }, folder, find);

    expect(q.populate).toEqual({ notes: 'false', cover: true });
  });

  it('leaves populate untouched when no populated type is conditioned', async () => {
    const { sanitize } = createAPI(fakeChecker({}));

    const q = await sanitize.query({ populate: ['links', 'notes'] }, folder, find);

    expect(q.populate).toEqual(['links', 'notes']);
  });

  it('expands a dynamic zone wildcard into one fragment per component', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query({ populate: { blocks: { populate: '*' } } }, folder, find);

    expect(q.populate).toEqual({
      blocks: { on: { [LINKS]: { populate: { notes: { filters: OWNED_BY_A } } } } },
    });
  });

  it('turns a dotted path through a dynamic zone into one fragment per component', async () => {
    // The query layer loads every component of the zone with the path's rest, unfiltered
    const { sanitize } = createAPI();
    const blocks = { on: { [LINKS]: { populate: { notes: { filters: OWNED_BY_A } } } } };

    for (const populate of ['blocks.notes', ['blocks.notes'], { blocks: { populate: 'notes' } }]) {
      // eslint-disable-next-line no-await-in-loop
      const q = await sanitize.query({ populate }, folder, find);

      expect(q.populate).toEqual({ blocks });
    }

    // Through a relation too: each populate map is normalised
    expect(
      (await sanitize.query({ populate: 'folder.blocks.notes' }, note, find)).populate
    ).toEqual({ folder: { populate: { blocks } } });
  });

  describe('a relation reached through a dynamic zone whose find scope the caller lacks', () => {
    /** `strapi.auth.verify` refuses `api::note.note.find`, as the route permissions would */
    const refuseNotes = () => {
      (globalThis as unknown as { strapi: { auth: unknown } }).strapi.auth = {
        verify(_auth: unknown, { scope }: { scope: string }) {
          if (scope.startsWith(NOTE)) {
            throw new Error('Forbidden');
          }
        },
      };
    };

    // No row on notes (filtersFor answers {}), so no condition would be added either
    const noNoteRow = () => fakeChecker({});
    const emptied = { on: { [LINKS]: { populate: {} } } };
    // The stock visitor caches each scope decision per auth object: a fresh caller per test
    let caller: { auth: unknown; action: string };

    beforeEach(() => {
      caller = { auth: { ...auth }, action: 'find' };
    });

    it.each<[string, unknown]>([
      ['an object', { blocks: { populate: { notes: true } } }],
      ['a dotted path', 'blocks.notes'],
      ['a dotted path in a list', ['blocks.notes']],
      ['a wildcard', { blocks: { populate: '*' } }],
    ])(
      'removes it for populate as %s, as the stock step removes it elsewhere',
      async (_name, populate) => {
        refuseNotes();
        const { sanitize } = createAPI(noNoteRow());

        const q = await sanitize.query({ populate }, folder, caller);

        expect(q.populate).toEqual({ blocks: emptied });
        expect(notesNodes(q.populate)).toEqual([]);
      }
    );

    it('removes it below a relation and in an `on` fragment the caller wrote', async () => {
      refuseNotes();
      const { sanitize } = createAPI(noNoteRow());

      expect(
        (await sanitize.query({ populate: 'folder.blocks.notes' }, note, caller)).populate
      ).toEqual({ folder: { populate: { blocks: emptied } } });
      expect(
        (
          await sanitize.query(
            { populate: { blocks: { on: { [LINKS]: { populate: { notes: true } } } } } },
            folder,
            caller
          )
        ).populate
      ).toEqual({ blocks: emptied });
    });

    it('keeps it when the scope is held, and leaves an inactive checker alone', async () => {
      const { sanitize } = createAPI(noNoteRow());

      expect(
        (
          await sanitize.query(
            { populate: { blocks: { populate: { notes: true } } } },
            folder,
            caller
          )
        ).populate
      ).toEqual({ blocks: { on: { [LINKS]: { populate: { notes: true } } } } });

      refuseNotes();
      const inactive = createAPI({ ...noNoteRow(), isActive: () => false });
      const populate = { blocks: { populate: { notes: true } } };

      expect((await inactive.sanitize.query({ populate }, folder, caller)).populate).toEqual(
        populate
      );
    });
  });

  it('gives a morph note fragment the condition and leaves an unconditioned one', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { populate: { pinned: { on: { [NOTE]: { fields: ['title'] }, [FOLDER]: true } } } },
      folder,
      find
    );

    expect(q.populate).toEqual({
      pinned: { on: { [NOTE]: { fields: ['title'], filters: OWNED_BY_A }, [FOLDER]: true } },
    });
  });

  it('drops a conditioned type from a morph count, which the query layer counts unfiltered', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { populate: { pinned: { count: true, on: { [NOTE]: true, [FOLDER]: true } } } },
      folder,
      find
    );

    expect(q.populate).toEqual({ pinned: { count: true, on: { [FOLDER]: true } } });
  });

  it('removes a morph node it cannot attach a condition to', async () => {
    const checker = fakeChecker();

    // sanitize.query's stock step turns these into `on` fragments first; applyConditions alone
    // fails closed
    for (const pinned of [true, 'true', { count: true }, { populate: '*' }]) {
      // eslint-disable-next-line no-await-in-loop
      const q = await applyConditions({ populate: { pinned, name: true } }, folder, {
        auth,
        action: 'find',
        checker,
        getModel,
      });

      expect(q.populate).toEqual({ name: true });
    }
  });

  it('removes a relation node of a conditioned type whose value no condition can be attached to', async () => {
    const checker = fakeChecker();

    for (const notes of [1, ['title'], null]) {
      // eslint-disable-next-line no-await-in-loop
      const q = await applyConditions({ populate: { notes, links: true } }, folder, {
        auth,
        action: 'find',
        checker,
        getModel,
      });

      expect(q.populate).toEqual({ links: true });
    }
  });

  it('conditions the relation filters inside a populate node', async () => {
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: OWNED_BY_A }));

    const q = await sanitize.query(
      { populate: { folder: { filters: { notes: { title: { $startsWith: 'B' } } } } } },
      note,
      find
    );

    expect(q.populate).toEqual({
      folder: {
        filters: { notes: { $and: [{ title: { $startsWith: 'B' } }, OWNED_BY_A, EXISTS] } },
      },
    });
  });
});

describe('applyConditions: relation filters', () => {
  it('ANDs the condition inside a relation filter', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: { notes: { title: { $startsWith: 'B' } } } },
      folder,
      { auth }
    );

    expect(q.filters).toEqual({
      notes: { $and: [{ title: { $startsWith: 'B' } }, OWNED_BY_A, EXISTS] },
    });
  });

  it('conditions a relation filter at every depth and inside $or, $and and components', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      {
        filters: {
          $or: [{ notes: { title: { $eq: 'a' } } }, { name: { $eq: 'b' } }],
          $and: [{ notes: { title: { $eq: 'c' } } }],
          links: { notes: { title: { $eq: 'd' } } },
        },
      },
      folder,
      find
    );

    // Each key holds a conditioned relation filter, so each gets its own item of the $and
    expect(q.filters).toEqual({
      $and: [
        {
          $or: [
            { notes: { $and: [{ title: { $eq: 'a' } }, OWNED_BY_A, EXISTS] } },
            { name: { $eq: 'b' } },
          ],
        },
        { $and: [{ notes: { $and: [{ title: { $eq: 'c' } }, OWNED_BY_A, EXISTS] } }] },
        { links: { notes: { $and: [{ title: { $eq: 'd' } }, OWNED_BY_A, EXISTS] } } },
      ],
    });
  });

  it('conditions a relation filter that goes back through an unconditioned type', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: { folder: { notes: { title: { $eq: 'x' } } } } },
      note,
      find
    );

    expect(q.filters).toEqual({
      $and: [
        { folder: { notes: { $and: [{ title: { $eq: 'x' } }, OWNED_BY_A, EXISTS] } } },
        OWNED_BY_A,
      ],
    });
  });

  it('turns an id or operator relation filter into an id filter before ANDing it', async () => {
    const { sanitize } = createAPI();

    const filters = async (value: unknown) =>
      (await sanitize.query({ filters: { notes: value } }, folder, find)).filters;

    expect(await filters(5)).toEqual({ notes: { $and: [{ id: 5 }, OWNED_BY_A, EXISTS] } });
    expect(await filters({ $notNull: true })).toEqual({
      notes: { $and: [{ id: { $notNull: true } }, OWNED_BY_A, EXISTS] },
    });
    expect(await filters({ $in: [1, 2] })).toEqual({
      notes: { $and: [{ id: { $in: [1, 2] } }, OWNED_BY_A, EXISTS] },
    });
    // A group operator is a filter on the target's attributes, as it is
    expect(await filters({ $or: [{ title: { $eq: 'a' } }] })).toEqual({
      notes: { $and: [{ $or: [{ title: { $eq: 'a' } }] }, OWNED_BY_A, EXISTS] },
    });
  });

  it('leaves a relation filter to an unconditioned type alone', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query({ filters: { owner: { name: { $eq: 'a' } } } }, note, find);

    expect(q.filters).toEqual({ $and: [{ owner: { name: { $eq: 'a' } } }, OWNED_BY_A] });
  });
});

describe('applyConditions: what a LEFT JOIN null row can match', () => {
  it('requires the related entry to exist, so the deny filter matches no null row', async () => {
    // `id IS NULL` is true of the row of nulls a folder with no notes joins: without the
    // existence clause, `title $null` would tell folders with no notes from folders with notes
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: null }));

    const q = await sanitize.query(
      { filters: { notes: { title: { $null: true } } } },
      folder,
      find
    );

    expect(q.filters).toEqual({
      notes: { $and: [{ title: { $null: true } }, DENY_ALL_FILTER, EXISTS] },
    });
  });

  it('requires it too for a condition a row of nulls satisfies', async () => {
    const notArchived = { archivedAt: { $null: true } };
    const { sanitize } = createAPI(fakeChecker({ [NOTE]: notArchived }));

    const q = await sanitize.query({ filters: { notes: { $null: true } } }, folder, find);

    expect(q.filters).toEqual({
      notes: { $and: [{ id: { $null: true } }, notArchived, EXISTS] },
    });
  });
});

describe('applyConditions: sorts through a conditioned relation', () => {
  it('refuses a sort through a conditioned relation and drops it in sanitize', async () => {
    const { sanitize, validate } = createAPI();

    await expect(validate.query({ sort: 'notes.title' }, folder, find)).rejects.toThrow(
      ValidationError
    );
    await expect(validate.query({ sort: 'notes.title' }, folder, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'notes', source: 'query', param: 'sort' },
    });

    expect(await sanitize.query({ sort: 'notes.title' }, folder, find)).toEqual({});
  });

  it('names the whole path of a nested sort, and drops it entirely', async () => {
    const { sanitize, validate } = createAPI();

    await expect(
      validate.query({ sort: { folder: { notes: { title: 'asc' } } } }, note, find)
    ).rejects.toMatchObject({ details: { key: 'notes', path: 'folder.notes' } });

    const q = await sanitize.query(
      { sort: ['folder.notes.title:asc', 'title:desc', 'folder.name'] },
      note,
      find
    );

    expect(q.sort).toEqual(['title:desc', 'folder.name']);
    expect((await sanitize.query({ sort: 'folder.notes.title,title' }, note, find)).sort).toBe(
      'title'
    );
  });

  it('refuses and drops a sort through a conditioned relation inside populate', async () => {
    const { sanitize, validate } = createAPI();
    const populate = { folder: { sort: 'notes.title', fields: ['name'] } };

    await expect(validate.query({ populate }, note, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'folder.notes', source: 'query', param: 'populate' },
    });
    expect((await sanitize.query({ populate }, note, find)).populate).toEqual({
      folder: { fields: ['name'] },
    });
  });

  it('accepts a sort through an unconditioned relation', async () => {
    const { sanitize, validate } = createAPI();

    await expect(validate.query({ sort: 'folder.name' }, note, find)).resolves.toBeUndefined();
    expect((await sanitize.query({ sort: 'folder.name' }, note, find)).sort).toBe('folder.name');
  });

  it('refuses a sort through a relation whose rows all deny', async () => {
    const { validate } = createAPI(fakeChecker({ [NOTE]: null }));

    await expect(validate.sort('notes.title', folder, find)).rejects.toThrow(ValidationError);
  });
});

describe('applyConditions: explain records what it narrows', () => {
  /** What the checker was told, of the kinds this describe is about */
  const narrowed = (checker: FakeChecker) =>
    checker.recorded.filter((entry) => entry.kind === 'query-narrowed');

  it('records a sort it drops, with the type it was dropped for', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);

    await sanitize.query({ sort: 'notes.title' }, folder, find);

    expect(narrowed(checker)).toEqual([
      {
        kind: 'query-narrowed',
        uid: FOLDER,
        at: 'sort',
        path: 'notes',
        target: NOTE,
        reason: 'sort-dropped',
      },
    ]);
  });

  it('records a $not it makes match nothing', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);

    await sanitize.query(
      { filters: { $not: { notes: { id: { $notNull: true } } } } },
      folder,
      find
    );

    expect(narrowed(checker)).toEqual([
      { kind: 'query-narrowed', uid: FOLDER, at: 'filter', reason: 'not-replaced' },
    ]);
  });

  it('records a type it leaves out of a morph count', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);

    await sanitize.query(
      { populate: { pinned: { count: true, on: { [NOTE]: true, [FOLDER]: true } } } },
      folder,
      find
    );

    expect(narrowed(checker)).toEqual([
      {
        kind: 'query-narrowed',
        uid: FOLDER,
        at: 'populate',
        path: 'pinned',
        target: NOTE,
        reason: 'morph-left-out',
      },
    ]);
  });

  it('records a populate it removes because no condition can be attached to it', async () => {
    const checker = fakeChecker();
    const options = { auth, action: 'find', checker, getModel };

    await applyConditions({ populate: { pinned: true, notes: 1 } }, folder, options);

    expect(narrowed(checker)).toEqual([
      {
        kind: 'query-narrowed',
        uid: FOLDER,
        at: 'populate',
        path: 'pinned',
        reason: 'populate-removed',
      },
      {
        kind: 'query-narrowed',
        uid: FOLDER,
        at: 'populate',
        path: 'notes',
        target: NOTE,
        reason: 'populate-removed',
      },
    ]);
  });

  it('records a relation the scope check takes out of a populate, a filter and a sort', async () => {
    const checker = fakeChecker({});
    const { sanitize } = createAPI(checker);

    (globalThis as unknown as { strapi: { auth: unknown } }).strapi.auth = {
      verify(_auth: unknown, { scope }: { scope: string }) {
        if (scope === `${NOTE}.find`) {
          throw new Error('Forbidden');
        }
      },
    };

    await sanitize.query(
      {
        populate: { notes: true },
        filters: { notes: { title: { $eq: 'x' } } },
        sort: 'notes.title',
      },
      folder,
      { auth: {}, action: 'find' }
    );

    // Once for the populate, once for the filter and once for the sort: the collector keeps one
    const removal = { kind: 'relation-removed', uid: FOLDER, path: 'notes', target: NOTE };

    expect(checker.recorded.filter((entry) => entry.kind === 'relation-removed')).toEqual([
      removal,
      removal,
      removal,
    ]);
  });

  it('records a relation of an input and an output that the scope check takes out', async () => {
    const checker = fakeChecker({});
    const { sanitize } = createAPI(checker);

    (globalThis as unknown as { strapi: { auth: unknown } }).strapi.auth = {
      verify(_auth: unknown, { scope }: { scope: string }) {
        if (scope === `${NOTE}.find`) {
          throw new Error('Forbidden');
        }
      },
    };

    // A new caller each time: the scope decisions are kept per caller
    await sanitize.output({ title: 'x', notes: [{ title: 'y' }] }, folder, {
      auth: {},
      action: 'find',
    });
    await sanitize.input({ name: 'x', notes: { connect: [{ documentId: 'n1' }] } }, folder, {
      auth: {},
      action: 'create',
    });

    const removal = { kind: 'relation-removed', uid: FOLDER, path: 'notes', target: NOTE };

    expect(checker.recorded.filter((entry) => entry.kind === 'relation-removed')).toEqual([
      removal,
      removal,
    ]);
  });

  it('records no relation removal for a caller whose checker is not active', async () => {
    const checker = { ...fakeChecker({}), isActive: () => false };
    const record = vi.spyOn(checker, 'record');
    const { sanitize } = createAPI(checker);

    (globalThis as unknown as { strapi: { auth: unknown } }).strapi.auth = {
      verify(_auth: unknown, { scope }: { scope: string }) {
        if (scope === `${NOTE}.find`) {
          throw new Error('Forbidden');
        }
      },
    };

    const q = await sanitize.query({ populate: { notes: true, name: true } }, folder, {
      auth: {},
      action: 'find',
    });

    expect(q.populate).toEqual({ name: true });
    expect(record).not.toHaveBeenCalled();
  });
});

describe('applyConditions: explain and inactive checkers', () => {
  it('records each condition it applies', async () => {
    const checker = fakeChecker();
    const { sanitize } = createAPI(checker);

    await sanitize.query(
      {
        filters: { folder: { notes: { title: { $eq: 'x' } } } },
        populate: { folder: { populate: { notes: true } } },
      },
      note,
      find
    );

    expect(checker.recorded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'condition-applied',
          uid: NOTE,
          action: 'find',
          at: 'root',
        }),
        expect.objectContaining({
          kind: 'condition-applied',
          uid: NOTE,
          action: 'find',
          at: 'filter',
          path: 'folder.notes',
        }),
        expect.objectContaining({
          kind: 'condition-applied',
          uid: NOTE,
          action: 'find',
          at: 'populate',
          path: 'folder.notes',
        }),
      ])
    );
    expect(checker.recorded).toHaveLength(3);
  });

  it('returns the query as it is for an inactive checker', async () => {
    const checker = { ...fakeChecker(), isActive: () => false };
    const query = { filters: { title: { $eq: 'x' } }, populate: 'notes' };

    expect(await applyConditions(query, folder, { auth, checker, getModel })).toBe(query);
  });
});

describe('applyConditions: $not above a conditioned relation', () => {
  it('makes the $not match nothing, and validate refuses it', async () => {
    // Per joined row, `NOT (… AND condition AND exists)` is true on the rows of B's notes: the
    // folders holding them would come back
    const { sanitize, validate } = createAPI();
    const filters = { $not: { notes: { id: { $notNull: true } } } };

    expect((await sanitize.query({ filters }, folder, find)).filters).toEqual({
      $not: EVERY_ROW,
    });
    await expect(validate.query({ filters }, folder, find)).rejects.toMatchObject({
      name: 'ValidationError',
      details: { key: 'notes', path: 'notes', source: 'query', param: 'filters' },
    });
  });

  it('finds the relation at any depth under the $not, inside $or, $and and lists', async () => {
    const { sanitize, validate } = createAPI();
    const filters = {
      $or: [{ $not: { folder: { notes: { title: { $eq: 'x' } } } } }, { title: { $eq: 'y' } }],
    };

    expect((await sanitize.query({ filters }, note, find)).filters).toEqual({
      $and: [{ $or: [{ $not: EVERY_ROW }, { title: { $eq: 'y' } }] }, OWNED_BY_A],
    });
    await expect(validate.query({ filters }, note, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'folder.notes', param: 'filters' },
    });

    const listed = { $and: [{ $not: [{ links: { notes: { id: 1 } } }] }] };

    expect((await sanitize.query({ filters: listed }, folder, find)).filters).toEqual({
      $and: [{ $not: EVERY_ROW }],
    });
    await expect(validate.query({ filters: listed }, folder, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'links.notes' },
    });
  });

  it('replaces the outermost $not, so no negation above turns the replacement around', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: { $not: { name: { $eq: 'a' }, $not: { notes: { title: { $eq: 'b' } } } } } },
      folder,
      find
    );

    expect(q.filters).toEqual({ $not: EVERY_ROW });
  });

  it('denies under $not through a to-one relation too', async () => {
    // A condition may join a to-many relation of its own, so a to-one hop can still multiply rows
    const { sanitize, validate } = createAPI(fakeChecker({ [FOLDER]: { name: { $eq: 'mine' } } }));
    const filters = { $not: { folder: { name: { $eq: 'x' } } } };

    expect((await sanitize.query({ filters }, note, find)).filters).toEqual({ $not: EVERY_ROW });
    await expect(validate.query({ filters }, note, find)).rejects.toMatchObject({
      details: { key: 'folder', path: 'folder' },
    });
  });

  it('keeps a $not over unconditioned relations and over the fields of the type', async () => {
    const { sanitize, validate } = createAPI();
    const filters = { $not: { owner: { name: { $eq: 'a' } }, title: { $eq: 'b' } } };

    expect((await sanitize.query({ filters }, note, find)).filters).toEqual({
      $and: [filters, OWNED_BY_A],
    });
    await expect(validate.query({ filters }, note, find)).resolves.toBeUndefined();
    // A conditioned relation filter that is not under a $not is accepted
    await expect(
      validate.query({ filters: { notes: { title: { $eq: 'x' } } } }, folder, find)
    ).resolves.toBeUndefined();
  });

  it('does the same inside the filters of a populate node', async () => {
    const { sanitize, validate } = createAPI();
    const populate = { folder: { filters: { $not: { notes: { title: { $null: true } } } } } };

    expect((await sanitize.query({ populate }, note, find)).populate).toEqual({
      folder: { filters: { $not: EVERY_ROW } },
    });
    await expect(validate.query({ populate }, note, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'folder.notes', source: 'query', param: 'populate' },
    });
  });

  it('finds the $not through lists nested in lists (filters[$not][0][0][notes]…)', async () => {
    const { sanitize, validate } = createAPI();
    const filters = { $not: [[{ notes: { id: { $eq: 1 } } }]] };

    expect((await sanitize.query({ filters }, folder, find)).filters).toEqual({
      $not: EVERY_ROW,
    });
    await expect(validate.query({ filters }, folder, find)).rejects.toMatchObject({
      name: 'ValidationError',
      details: { key: 'notes', path: 'notes', param: 'filters' },
    });

    const deeper = { $or: [{ $not: [[[{ links: { notes: { title: { $eq: 'x' } } } }]]] }] };

    await expect(validate.query({ filters: deeper }, folder, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'links.notes' },
    });
  });

  it('leaves alone a $not for a caller whose checker is not active', async () => {
    const checker = { ...fakeChecker(), isActive: () => false };
    const { validate } = createAPI(checker);

    await expect(
      validate.query({ filters: { $not: { notes: { id: 1 } } } }, folder, find)
    ).resolves.toBeUndefined();
  });
});

describe('applyConditions: where objects the query layer merges', () => {
  // The query layer builds one object per where object and merges what each key gives into it
  // (`processWhere`, `Object.assign`): two `$and` from one object would leave only the last one

  const OWNED_FOLDER = { name: { $eq: 'mine' } };
  const SELF = { name: { $eq: 'me' } };

  it('splits two conditioned relation filters side by side into an $and', async () => {
    const { sanitize } = createAPI(
      fakeChecker({ [NOTE]: OWNED_BY_A, [FOLDER]: OWNED_FOLDER, [USER]: SELF })
    );

    const q = await sanitize.query(
      { filters: { owner: { name: { $eq: 'a' } }, folder: { name: { $eq: 'b' } } } },
      note,
      find
    );

    expect(q.filters).toEqual({
      $and: [
        {
          $and: [
            { owner: { $and: [{ name: { $eq: 'a' } }, SELF, EXISTS] } },
            { folder: { $and: [{ name: { $eq: 'b' } }, OWNED_FOLDER, EXISTS] } },
          ],
        },
        OWNED_BY_A,
      ],
    });
  });

  it("splits a caller's $and from a conditioned relation filter beside it", async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { filters: { $and: [{ name: { $eq: 'x' } }], notes: { title: { $eq: 'y' } } } },
      folder,
      find
    );

    expect(q.filters).toEqual({
      $and: [
        { $and: [{ name: { $eq: 'x' } }] },
        { notes: { $and: [{ title: { $eq: 'y' } }, OWNED_BY_A, EXISTS] } },
      ],
    });
  });

  it('splits a component that holds one from a conditioned relation filter beside it', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      {
        filters: {
          links: { notes: { title: { $eq: 'a' } } },
          notes: { title: { $eq: 'b' } },
        },
      },
      folder,
      find
    );

    expect(q.filters).toEqual({
      $and: [
        { links: { notes: { $and: [{ title: { $eq: 'a' } }, OWNED_BY_A, EXISTS] } } },
        { notes: { $and: [{ title: { $eq: 'b' } }, OWNED_BY_A, EXISTS] } },
      ],
    });
  });

  it('splits inside a relation filter and inside a populate node', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      {
        filters: { folder: { name: { $eq: 'n' }, notes: { title: { $eq: 't' } } } },
        populate: { folder: { filters: { name: { $eq: 'n' }, notes: { title: { $eq: 't' } } } } },
      },
      note,
      find
    );

    const split = {
      $and: [
        { name: { $eq: 'n' } },
        { notes: { $and: [{ title: { $eq: 't' } }, OWNED_BY_A, EXISTS] } },
      ],
    };

    expect(q.filters).toEqual({ $and: [{ folder: split }, OWNED_BY_A] });
    expect(q.populate).toEqual({ folder: { filters: split } });
  });

  describe('a relation value that mixes an operator and attribute keys', () => {
    // The probe shapes of a review: the caller's `name` clause was silently dropped
    const all = () => fakeChecker({ [NOTE]: OWNED_BY_A, [FOLDER]: OWNED_FOLDER, [USER]: SELF });

    it('splits it when the operator comes first (M1)', async () => {
      const { sanitize } = createAPI(all());

      const q = await sanitize.query(
        {
          filters: {
            folder: { $and: [{ name: { $eq: 'f1' } }], notes: { title: { $eq: 'a-in-3' } } },
          },
        },
        note,
        find
      );

      expect(q.filters).toEqual({
        $and: [
          {
            folder: {
              $and: [
                {
                  $and: [
                    { $and: [{ name: { $eq: 'f1' } }] },
                    { notes: { $and: [{ title: { $eq: 'a-in-3' } }, OWNED_BY_A, EXISTS] } },
                  ],
                },
                OWNED_FOLDER,
                EXISTS,
              ],
            },
          },
          OWNED_BY_A,
        ],
      });
    });

    it.each([
      ['a hidden title (M3)', 'b-in-3'],
      ['an absent title (M4)', 'nope'],
    ])('splits it when the relation comes first, probing %s', async (_label, title) => {
      const { sanitize } = createAPI(all());

      const q = await sanitize.query(
        {
          filters: {
            folder: { notes: { title: { $eq: title } }, $and: [{ name: { $eq: 'f3' } }] },
          },
        },
        note,
        find
      );

      expect(q.filters).toEqual({
        $and: [
          {
            folder: {
              $and: [
                {
                  $and: [
                    { notes: { $and: [{ title: { $eq: title } }, OWNED_BY_A, EXISTS] } },
                    { $and: [{ name: { $eq: 'f3' } }] },
                  ],
                },
                OWNED_FOLDER,
                EXISTS,
              ],
            },
          },
          OWNED_BY_A,
        ],
      });
    });

    it('splits it under a component, which gets no condition of its own', async () => {
      const { sanitize } = createAPI();

      const q = await sanitize.query(
        {
          filters: {
            links: { $or: [{ label: { $eq: 'a' } }], notes: { title: { $eq: 'b' } } },
          },
        },
        folder,
        find
      );

      expect(q.filters).toEqual({
        links: {
          $and: [
            { $or: [{ label: { $eq: 'a' } }] },
            { notes: { $and: [{ title: { $eq: 'b' } }, OWNED_BY_A, EXISTS] } },
          ],
        },
      });
    });

    it('reads a relation value of two group operators as a where too, and splits it', async () => {
      const { sanitize } = createAPI(all());

      const q = await sanitize.query(
        {
          filters: {
            folder: { $or: [{ name: { $eq: 'a' } }], $and: [{ notes: { title: { $eq: 'b' } } }] },
          },
        },
        note,
        find
      );

      expect(q.filters).toEqual({
        $and: [
          {
            folder: {
              $and: [
                {
                  $and: [
                    { $or: [{ name: { $eq: 'a' } }] },
                    {
                      $and: [{ notes: { $and: [{ title: { $eq: 'b' } }, OWNED_BY_A, EXISTS] } }],
                    },
                  ],
                },
                OWNED_FOLDER,
                EXISTS,
              ],
            },
          },
          OWNED_BY_A,
        ],
      });
    });
  });

  it('leaves a where object with no conditioned relation filter as it is', async () => {
    const { sanitize } = createAPI();
    const filters = { title: { $eq: 'x' }, owner: { name: { $eq: 'a' } }, $or: [{ id: 1 }] };

    expect((await sanitize.query({ filters }, note, find)).filters).toEqual({
      $and: [filters, OWNED_BY_A],
    });
  });
});

describe('applyConditions: node options read by name', () => {
  it('conditions a nested populate under a target with a `populate` attribute', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { populate: { items: { populate: { notes: true } } } },
      board,
      find
    );

    expect(q.populate).toEqual({ items: { populate: { notes: { filters: OWNED_BY_A } } } });
  });

  it('conditions morph fragments under an owner with an `on` attribute', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      {
        populate: {
          pinned: {
            on: { [NOTE]: { fields: ['title'] }, [ITEM]: { populate: { notes: true } } },
          },
        },
      },
      board,
      find
    );

    expect(q.populate).toEqual({
      pinned: {
        on: {
          [NOTE]: { fields: ['title'], filters: OWNED_BY_A },
          [ITEM]: { populate: { notes: { filters: OWNED_BY_A } } },
        },
      },
    });
  });

  it('conditions dynamic-zone fragments under an owner with an `on` attribute', async () => {
    const { sanitize } = createAPI();

    const q = await sanitize.query(
      { populate: { blocks: { on: { [LINKS]: { populate: { notes: true } } } } } },
      board,
      find
    );

    expect(q.populate).toEqual({
      blocks: { on: { [LINKS]: { populate: { notes: { filters: OWNED_BY_A } } } } },
    });
  });

  it('drops a sort and denies a $not in a node reached through a `populate` attribute', async () => {
    const { sanitize, validate } = createAPI();
    const sorted = { items: { populate: { folder: { sort: 'notes.title', fields: ['name'] } } } };
    const negated = {
      items: { populate: { folder: { filters: { $not: { notes: { id: { $notNull: true } } } } } } },
    };

    expect((await sanitize.query({ populate: sorted }, board, find)).populate).toEqual({
      items: { populate: { folder: { fields: ['name'] } } },
    });
    expect((await sanitize.query({ populate: negated }, board, find)).populate).toEqual({
      items: { populate: { folder: { filters: { $not: EVERY_ROW } } } },
    });
    // The stock populate validator already refuses a nested populate under such a target
    await expect(validate.query({ populate: sorted }, board, find)).rejects.toThrow(
      ValidationError
    );
  });

  it('drops and refuses a sort and a $not in fragments under an owner with an `on` attribute', async () => {
    const { sanitize, validate } = createAPI();
    const sorted = { pinned: { on: { [FOLDER]: { sort: 'notes.title', fields: ['name'] } } } };
    const negated = { blocks: { on: { [LINKS]: { filters: { $not: { notes: { id: 1 } } } } } } };

    expect((await sanitize.query({ populate: sorted }, board, find)).populate).toEqual({
      pinned: { on: { [FOLDER]: { fields: ['name'] } } },
    });
    expect((await sanitize.query({ populate: negated }, board, find)).populate).toEqual({
      blocks: { on: { [LINKS]: { filters: { $not: EVERY_ROW } } } },
    });
    await expect(validate.query({ populate: sorted }, board, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'pinned.notes', param: 'populate' },
    });
    await expect(validate.query({ populate: negated }, board, find)).rejects.toMatchObject({
      details: { key: 'notes', path: 'blocks.notes', param: 'populate' },
    });
  });
});

describe('validate: one question per related type for the whole query', () => {
  it('asks the checker about each related type once per validate.query', async () => {
    const checker = fakeChecker({});
    const { validate } = createAPI(checker);

    await validate.query(
      {
        filters: { $not: { folder: { name: { $eq: 'a' } } }, folder: { name: { $eq: 'b' } } },
        sort: ['folder.name', 'folder.notes.title'],
        populate: { folder: { sort: 'notes.title', populate: { notes: { sort: 'folder.name' } } } },
      },
      note,
      find
    );

    expect(checker.asked).toEqual([
      ['find', FOLDER],
      ['find', NOTE],
    ]);
  });
});
