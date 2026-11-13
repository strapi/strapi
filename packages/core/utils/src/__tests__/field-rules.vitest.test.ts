import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FieldRules, PermissionChecker } from '../content-api-permissions';
import { createAPISanitizers, visitors } from '../sanitize';
import traverseEntity from '../traverse-entity';
import { createAPIValidators } from '../validate';
import { ValidationError } from '../errors';
import {
  allows,
  compileFields,
  fieldsOfEntry,
  queryableFields,
  type EntryMatcher,
} from '../field-rules';
import type { Model } from '../types';

const USER_UID = 'plugin::end-users.user';
const NOTE_UID = 'api::note.note';
const FOLDER_UID = 'api::folder.folder';
const SEO_UID = 'shared.seo';

const user = {
  uid: USER_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  options: {},
  attributes: { email: { type: 'string' }, name: { type: 'string' } },
} satisfies Model;

const seo = {
  uid: SEO_UID,
  modelType: 'component' as const,
  info: { displayName: 'Seo' },
  options: {},
  attributes: { metaTitle: { type: 'string' }, metaDescription: { type: 'string' } },
} satisfies Model;

const note = {
  uid: NOTE_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string' },
    body: { type: 'text' },
    secret: { type: 'string' },
    internalNotes: { type: 'text' },
    owner: { type: 'relation', relation: 'manyToOne', target: USER_UID },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER_UID },
    seo: { type: 'component', component: SEO_UID, repeatable: false },
    createdAt: { type: 'datetime' },
    publishedAt: { type: 'datetime' },
    locale: { type: 'string' },
  },
} satisfies Model & { pluginOptions: object };

const folder = {
  uid: FOLDER_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'folder', pluralName: 'folders', displayName: 'Folder' },
  options: {},
  attributes: {
    label: { type: 'string' },
    name: { type: 'string' },
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE_UID },
  },
} satisfies Model;

const models: Record<string, Model> = {
  [NOTE_UID]: note,
  [FOLDER_UID]: folder,
  [USER_UID]: user,
  [SEO_UID]: seo,
};
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

const EVERY_FIELD: FieldRules = { always: null, conditional: [] };

/** `fieldsFor` answers by `<action>|<uid>`; what is not in the table is route-level: every field */
const checkerOf = (
  table: Record<string, FieldRules> = {},
  overrides: Partial<PermissionChecker> = {}
) => {
  const checker = {
    isActive: vi.fn(() => true),
    filtersFor: vi.fn(() => ({})),
    canReadDrafts: vi.fn(() => true),
    fieldsFor: vi.fn(
      (_auth: unknown, action: string, uid: string) => table[`${action}|${uid}`] ?? EVERY_FIELD
    ),
    readableFields: vi.fn(() => null),
    writableFields: vi.fn(() => null),
    lockedFields: vi.fn(() => []),
    stampFor: vi.fn(() => ({})),
    populateDepth: vi.fn(() => null),
    record: vi.fn(),
    ...overrides,
  };

  return checker as unknown as PermissionChecker & typeof checker;
};

const apiOf = (permissions: PermissionChecker, matchEntries?: EntryMatcher) => ({
  sanitize: createAPISanitizers({ getModel, permissions, matchEntries }),
  validate: createAPIValidators({ getModel, permissions, matchEntries }),
});

const rejection = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return error as ValidationError;
  }

  throw new Error('did not throw');
};

const NOTE_FIND = ['title', 'body', 'owner', 'folder', 'seo.metaTitle'];

describe('Content API permissions: field rules', () => {
  beforeEach(() => {
    // The relation visitors ask `strapi.auth.verify` whether the caller may read the target
    (globalThis as unknown as { strapi: unknown }).strapi = {
      contentTypes: models,
      components: {},
      getModel,
      auth: { verify: () => true },
    };
  });

  describe('the field lists', () => {
    it('allows a listed path, what is under it, and the path that holds a listed one', () => {
      const fields = compileFields(['title', 'seo.metaTitle', 'owner']);

      expect(allows(fields, 'title')).toBe(true);
      expect(allows(fields, 'owner.email')).toBe(true);
      expect(allows(fields, 'seo.metaTitle')).toBe(true);
      expect(allows(fields, 'seo')).toBe(true);
      expect(allows(fields, 'seo', false)).toBe(false);
      expect(allows(fields, 'seo.metaDescription')).toBe(false);
      expect(allows(fields, 'secret')).toBe(false);
      expect(allows(compileFields(null), 'anything')).toBe(true);
      expect(allows(compileFields([]), 'title')).toBe(false);
    });

    it('queries by `always` when an unconditioned row is held', () => {
      expect(
        queryableFields({ always: ['title'], conditional: [{ filter: {}, fields: ['secret'] }] })
      ).toEqual(['title']);
      expect(queryableFields({ always: null, conditional: [] })).toBeNull();
    });

    it('queries by the fields every conditional group has, and by none for no group', () => {
      expect(
        queryableFields({
          always: [],
          conditional: [
            { filter: { a: 1 }, fields: ['title', 'seo', 'body'] },
            { filter: { b: 2 }, fields: ['title', 'seo.metaTitle'] },
          ],
        })
      ).toEqual(['title', 'seo.metaTitle']);
      expect(
        queryableFields({
          always: [],
          conditional: [
            { filter: {}, fields: null },
            { filter: { b: 2 }, fields: ['title'] },
          ],
        })
      ).toEqual(['title']);
      expect(
        queryableFields({ always: [], conditional: [{ filter: {}, fields: null }] })
      ).toBeNull();
      expect(queryableFields({ always: [], conditional: [] })).toEqual([]);
    });

    it('gives an entry the fields of always and of the groups it matches', () => {
      const rules = {
        always: ['title'],
        conditional: [
          { filter: { a: 1 }, fields: ['secret'] },
          { filter: { b: 2 }, fields: ['body'] },
        ],
      };

      expect(fieldsOfEntry(rules, [])).toEqual(['title']);
      expect(fieldsOfEntry(rules, [1, 0])).toEqual(['title', 'body', 'secret']);
      expect(
        fieldsOfEntry({ always: [], conditional: [{ filter: {}, fields: null }] }, [0])
      ).toBeNull();
    });
  });

  describe('sanitize.output', () => {
    const entry = (extra: Record<string, unknown> = {}) => ({
      id: 1,
      documentId: 'n1',
      title: 't',
      body: 'b',
      secret: 's',
      internalNotes: 'i',
      createdAt: '2026-01-01',
      publishedAt: null,
      locale: 'en',
      ...extra,
    });

    it('strips a field missing from the find list and keeps the always-readable ones', async () => {
      const checker = checkerOf({ [`find|${NOTE_UID}`]: { always: NOTE_FIND, conditional: [] } });
      const { sanitize } = apiOf(checker);

      expect(await sanitize.output(entry(), note, { auth, action: 'find' })).toEqual({
        id: 1,
        documentId: 'n1',
        title: 't',
        body: 'b',
        createdAt: '2026-01-01',
        publishedAt: null,
        locale: 'en',
      });
      expect(checker.fieldsFor).toHaveBeenCalledWith(auth, 'find', NOTE_UID);
    });

    it('records each field it strips, with the type and the rule action', async () => {
      const checker = checkerOf({ [`find|${NOTE_UID}`]: { always: NOTE_FIND, conditional: [] } });
      const { sanitize } = apiOf(checker);

      await sanitize.output(entry(), note, { auth, action: 'find' });

      expect(checker.record).toHaveBeenCalledWith(auth, {
        kind: 'field-removed',
        uid: NOTE_UID,
        action: 'find',
        path: 'secret',
        roles: [],
      });
      expect(checker.record).toHaveBeenCalledTimes(2);
    });

    it('reads findOne fields on findOne, create and update, and find fields otherwise', async () => {
      const checker = checkerOf({
        [`find|${NOTE_UID}`]: { always: ['title'], conditional: [] },
        [`findOne|${NOTE_UID}`]: { always: ['title', 'secret'], conditional: [] },
      });
      const { sanitize } = apiOf(checker);

      for (const action of ['findOne', 'create', 'update']) {
        // eslint-disable-next-line no-await-in-loop
        expect(await sanitize.output(entry(), note, { auth, action })).toMatchObject({
          title: 't',
          secret: 's',
        });
      }

      for (const action of ['find', 'custom', undefined]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await sanitize.output(entry(), note, { auth, action })).not.toHaveProperty('secret');
      }
    });

    it('keeps an allowed component sub-path and strips its sibling', async () => {
      const checker = checkerOf({
        [`find|${NOTE_UID}`]: { always: ['title', 'seo.metaTitle'], conditional: [] },
      });
      const { sanitize } = apiOf(checker);

      expect(
        await sanitize.output(
          entry({ seo: { id: 3, metaTitle: 'm', metaDescription: 'd' } }),
          note,
          { auth, action: 'find' }
        )
      ).toMatchObject({ seo: { id: 3, metaTitle: 'm' } });
      expect(
        (
          (await sanitize.output(
            entry({ seo: { id: 3, metaTitle: 'm', metaDescription: 'd' } }),
            note,
            { auth, action: 'find' }
          )) as { seo: object }
        ).seo
      ).not.toHaveProperty('metaDescription');
    });

    it('strips a component whose path nothing allows', async () => {
      const checker = checkerOf({ [`find|${NOTE_UID}`]: { always: ['title'], conditional: [] } });
      const { sanitize } = apiOf(checker);

      expect(
        await sanitize.output(entry({ seo: { id: 3, metaTitle: 'm' } }), note, {
          auth,
          action: 'find',
        })
      ).not.toHaveProperty('seo');
    });

    it("applies the target type's find fields to a populated relation", async () => {
      const checker = checkerOf({
        [`find|${NOTE_UID}`]: { always: NOTE_FIND, conditional: [] },
        [`findOne|${NOTE_UID}`]: { always: [...NOTE_FIND, 'secret'], conditional: [] },
        [`find|${FOLDER_UID}`]: { always: ['label'], conditional: [] },
        [`findOne|${FOLDER_UID}`]: { always: ['label', 'name'], conditional: [] },
      });
      const { sanitize } = apiOf(checker);

      const result = (await sanitize.output(
        entry({ folder: { id: 2, documentId: 'f1', label: 'l', name: 'n' } }),
        note,
        { auth, action: 'findOne' }
      )) as { folder: object; secret: string };

      // The root reads by findOne, the relation by find
      expect(result.secret).toBe('s');
      expect(result.folder).toEqual({ id: 2, documentId: 'f1', label: 'l' });
      expect(checker.fieldsFor).toHaveBeenCalledWith(auth, 'find', FOLDER_UID);
    });

    it('strips each entry of a list', async () => {
      const checker = checkerOf({ [`find|${NOTE_UID}`]: { always: ['title'], conditional: [] } });
      const { sanitize } = apiOf(checker);

      expect(
        await sanitize.output([entry(), entry({ documentId: 'n2' })], note, {
          auth,
          action: 'find',
        })
      ).toEqual([
        expect.not.objectContaining({ secret: expect.anything() }),
        expect.not.objectContaining({ secret: expect.anything() }),
      ]);
    });

    describe('entry by entry', () => {
      const OWN = { owner: { documentId: 'u1' } };
      const rules: FieldRules = {
        always: ['title'],
        conditional: [{ filter: OWN, fields: ['secret'] }],
      };

      it('gives a conditioned row`s fields to the entries it matches, one query for a list', async () => {
        const checker = checkerOf({ [`find|${NOTE_UID}`]: rules });
        const matcher = vi.fn<EntryMatcher>(async () => ['n1']);
        const { sanitize } = apiOf(checker, matcher);

        const result = (await sanitize.output(
          [entry({ documentId: 'n1' }), entry({ documentId: 'n2' })],
          note,
          { auth, action: 'find' }
        )) as Array<Record<string, unknown>>;

        expect(result[0]).toHaveProperty('secret', 's');
        expect(result[1]).not.toHaveProperty('secret');
        expect(result.every((n) => n.title === 't' && !('body' in n))).toBe(true);
        expect(matcher).toHaveBeenCalledTimes(1);
        expect(matcher).toHaveBeenCalledWith({
          uid: NOTE_UID,
          documentIds: ['n1', 'n2'],
          filter: OWN,
          status: 'draft',
          locale: 'en',
        });
      });

      it('asks once for each group', async () => {
        const checker = checkerOf({
          [`find|${NOTE_UID}`]: {
            always: [],
            conditional: [
              { filter: OWN, fields: ['title', 'secret'] },
              { filter: { folder: { label: 'x' } }, fields: ['title', 'body'] },
            ],
          },
        });
        const matcher = vi.fn<EntryMatcher>(async ({ filter }) =>
          filter === OWN ? ['n1', 'n2'] : ['n2']
        );
        const { sanitize } = apiOf(checker, matcher);

        const [first, second] = (await sanitize.output(
          [entry({ documentId: 'n1' }), entry({ documentId: 'n2' })],
          note,
          { auth, action: 'find' }
        )) as Array<Record<string, unknown>>;

        expect(matcher).toHaveBeenCalledTimes(2);
        expect(first).toMatchObject({ title: 't', secret: 's' });
        expect(first).not.toHaveProperty('body');
        expect(second).toMatchObject({ title: 't', secret: 's', body: 'b' });
      });

      it('asks nothing for a read when one group is all there is: every entry matched it', async () => {
        const checker = checkerOf(
          {
            [`find|${NOTE_UID}`]: { always: [], conditional: [{ filter: OWN, fields: ['title'] }] },
          },
          // The read was filtered by the group's condition
          { filtersFor: vi.fn(() => OWN) }
        );
        const matcher = vi.fn<EntryMatcher>(async () => []);
        const { sanitize } = apiOf(checker, matcher);

        expect(await sanitize.output(entry(), note, { auth, action: 'find' })).not.toHaveProperty(
          'secret'
        );
        expect(await sanitize.output(entry(), note, { auth, action: 'find' })).toHaveProperty(
          'title'
        );
        expect(matcher).not.toHaveBeenCalled();
      });

      it('asks about each entry when the read was not filtered by the one group (an unconditioned row too)', async () => {
        const checker = checkerOf({
          [`find|${NOTE_UID}`]: { always: [], conditional: [{ filter: OWN, fields: ['title'] }] },
        });
        const matcher = vi.fn<EntryMatcher>(async () => []);
        const { sanitize } = apiOf(checker, matcher);

        const result = await sanitize.output(entry(), note, { auth, action: 'find' });

        expect(checker.filtersFor).toHaveBeenCalledWith(auth, 'find', NOTE_UID);
        expect(matcher).toHaveBeenCalledTimes(1);
        expect(result).not.toHaveProperty('title');
      });

      it('asks about a write response: it can show an entry the caller can not read', async () => {
        const own: FieldRules = { always: [], conditional: [{ filter: OWN, fields: ['title'] }] };
        const checker = checkerOf({
          [`find|${NOTE_UID}`]: own,
          [`findOne|${NOTE_UID}`]: own,
        });
        const matcher = vi.fn<EntryMatcher>(async () => []);
        const { sanitize } = apiOf(checker, matcher);

        const result = await sanitize.output(entry(), note, { auth, action: 'update' });

        expect(matcher).toHaveBeenCalledTimes(1);
        expect(result).not.toHaveProperty('title');
      });

      it('gives an entry the always fields only when it matches no group, or there is no matcher', async () => {
        const checker = checkerOf({ [`find|${NOTE_UID}`]: rules });

        expect(
          await apiOf(checker, async () => []).sanitize.output(entry(), note, {
            auth,
            action: 'find',
          })
        ).not.toHaveProperty('secret');
        expect(
          await apiOf(checker).sanitize.output(entry(), note, { auth, action: 'find' })
        ).not.toHaveProperty('secret');
      });

      it('asks about a relation`s target by its own rules', async () => {
        const checker = checkerOf({
          [`find|${NOTE_UID}`]: { always: null, conditional: [] },
          [`find|${FOLDER_UID}`]: {
            always: ['label'],
            conditional: [{ filter: { label: 'l' }, fields: ['name'] }],
          },
        });
        const matcher = vi.fn<EntryMatcher>(async ({ uid }) => (uid === FOLDER_UID ? ['f1'] : []));
        const { sanitize } = apiOf(checker, matcher);

        const result = (await sanitize.output(
          entry({ folder: { id: 2, documentId: 'f1', label: 'l', name: 'n' } }),
          note,
          { auth, action: 'find' }
        )) as { folder: Record<string, unknown> };

        expect(matcher).toHaveBeenCalledTimes(1);
        expect(matcher).toHaveBeenCalledWith(expect.objectContaining({ uid: FOLDER_UID }));
        expect(result.folder).toMatchObject({ label: 'l', name: 'n' });
      });
    });

    describe('the entry a group is checked against (Rulings 102 to 104)', () => {
      const OWN = { owner: { documentId: 'u1' } };
      const IN_FOLDER = { folder: { label: 'x' } };
      const oneGroup: FieldRules = {
        always: [],
        conditional: [{ filter: OWN, fields: ['title', 'secret'] }],
      };
      const twoGroups: FieldRules = {
        always: ['title'],
        conditional: [
          { filter: OWN, fields: ['secret'] },
          { filter: IN_FOLDER, fields: ['body'] },
        ],
      };
      /** What `fields=title,secret,body` leaves: no `publishedAt`, no `locale` */
      const shaped = { id: 1, documentId: 'n1', title: 't', secret: 's', body: 'b' };

      it('checks the group against the entry when the route found it in its own code (me)', async () => {
        const rules = {
          [`find|${NOTE_UID}`]: oneGroup,
          [`findOne|${NOTE_UID}`]: oneGroup,
        };
        const options = { auth, action: 'findOne', status: 'draft', locale: 'en' } as const;

        // The condition does not hold for this entry: the group's fields are not granted
        const refusing = vi.fn<EntryMatcher>(async () => []);
        const refused = await apiOf(checkerOf(rules), refusing).sanitize.output(entry(), note, {
          ...options,
          unfiltered: true,
        });

        expect(refusing).toHaveBeenCalledTimes(1);
        expect(refused).not.toHaveProperty('title');
        expect(refused).not.toHaveProperty('secret');

        // It holds: they are
        const matching = vi.fn<EntryMatcher>(async () => ['n1']);

        expect(
          await apiOf(checkerOf(rules), matching).sanitize.output(entry(), note, {
            ...options,
            unfiltered: true,
          })
        ).toMatchObject({ title: 't', secret: 's' });

        // A read that went through the caller's filter does not ask
        const skipped = vi.fn<EntryMatcher>(async () => []);

        expect(
          await apiOf(checkerOf(rules, { filtersFor: vi.fn(() => OWN) }), skipped).sanitize.output(
            entry(),
            note,
            options
          )
        ).toMatchObject({ title: 't', secret: 's' });
        expect(skipped).not.toHaveBeenCalled();
      });

      it('asks about the populated targets too when nothing is known to have matched', async () => {
        const rules = {
          [`find|${NOTE_UID}`]: { always: null, conditional: [] },
          [`find|${FOLDER_UID}`]: {
            always: [],
            conditional: [{ filter: { label: 'l' }, fields: ['label', 'name'] }],
          },
        } as Record<string, FieldRules>;
        const matcher = vi.fn<EntryMatcher>(async () => []);
        const result = (await apiOf(checkerOf(rules), matcher).sanitize.output(
          entry({ folder: { id: 2, documentId: 'f1', label: 'l', name: 'n' } }),
          note,
          { auth, action: 'find', unfiltered: true }
        )) as { folder: Record<string, unknown> };

        expect(matcher).toHaveBeenCalledWith(expect.objectContaining({ uid: FOLDER_UID }));
        expect(result.folder).not.toHaveProperty('label');
      });

      it('asks in the locale each entry was read in: a condition that holds in another grants nothing', async () => {
        const matcher = vi.fn<EntryMatcher>(async ({ locale }) => (locale === 'en' ? ['n1'] : []));
        const [english, french] = (await apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: twoGroups }),
          matcher
        ).sanitize.output(
          [entry({ documentId: 'n1', locale: 'en' }), entry({ documentId: 'n1', locale: 'fr' })],
          note,
          { auth, action: 'find' }
        )) as Array<Record<string, unknown>>;

        expect(english).toHaveProperty('secret', 's');
        expect(french).not.toHaveProperty('secret');
        expect(matcher.mock.calls.map(([query]) => query.locale).sort()).toEqual([
          'en',
          'en',
          'fr',
          'fr',
        ]);
      });

      it('asks about the version each entry is, the draft and the published one apart', async () => {
        const matcher = vi.fn<EntryMatcher>(async ({ status }) =>
          status === 'draft' ? ['n1'] : []
        );
        const [draft, published] = (await apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: twoGroups }),
          matcher
        ).sanitize.output(
          [entry({ publishedAt: null }), entry({ publishedAt: '2026-01-01' })],
          note,
          { auth, action: 'find' }
        )) as Array<Record<string, unknown>>;

        expect(draft).toHaveProperty('secret', 's');
        expect(published).not.toHaveProperty('secret');
      });

      it('grants only `always` when `fields` dropped publishedAt and locale and the request names none', async () => {
        const matcher = vi.fn<EntryMatcher>(async () => ['n1']);
        const result = (await apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: twoGroups }),
          matcher
        ).sanitize.output(shaped, note, { auth, action: 'find' })) as Record<string, unknown>;

        expect(result).toMatchObject({ title: 't' });
        expect(result).not.toHaveProperty('secret');
        expect(result).not.toHaveProperty('body');
        expect(matcher).not.toHaveBeenCalled();
      });

      it('places the root by the request`s status and locale when the entry does not say', async () => {
        const matcher = vi.fn<EntryMatcher>(async ({ filter }) => (filter === OWN ? ['n1'] : []));
        const result = (await apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: twoGroups }),
          matcher
        ).sanitize.output(shaped, note, {
          auth,
          action: 'find',
          status: 'published',
          locale: 'fr',
        })) as Record<string, unknown>;

        expect(matcher).toHaveBeenCalledWith({
          uid: NOTE_UID,
          documentIds: ['n1'],
          filter: OWN,
          status: 'published',
          locale: 'fr',
        });
        expect(result).toMatchObject({ title: 't', secret: 's' });
        expect(result).not.toHaveProperty('body');
      });

      it('prefers what the entry says to what the request names', async () => {
        const matcher = vi.fn<EntryMatcher>(async () => []);

        await apiOf(checkerOf({ [`find|${NOTE_UID}`]: twoGroups }), matcher).sanitize.output(
          entry({ publishedAt: null, locale: 'de' }),
          note,
          { auth, action: 'find', status: 'published', locale: 'fr' }
        );

        expect(matcher).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'draft', locale: 'de' })
        );
      });

      it.each(['*', undefined])('places no entry by a request locale of %s', async (locale) => {
        const matcher = vi.fn<EntryMatcher>(async () => ['n1']);
        const result = (await apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: twoGroups }),
          matcher
        ).sanitize.output(shaped, note, {
          auth,
          action: 'find',
          status: 'draft',
          locale,
        })) as Record<string, unknown>;

        expect(result).not.toHaveProperty('secret');
        expect(matcher).not.toHaveBeenCalled();
      });

      it('does not place a populated target by the request: it has to say itself', async () => {
        const matcher = vi.fn<EntryMatcher>(async () => ['n9']);
        const rules = {
          [`find|${NOTE_UID}`]: { always: null, conditional: [] },
          [`find|${FOLDER_UID}`]: { always: null, conditional: [] },
        } as Record<string, FieldRules>;

        // A folder's notes: the target type is draft & publish and localized, the entry says neither
        rules[`find|${NOTE_UID}`] = twoGroups;

        const result = (await apiOf(checkerOf(rules), matcher).sanitize.output(
          {
            id: 2,
            documentId: 'f1',
            label: 'l',
            notes: [{ id: 9, documentId: 'n9', title: 't', secret: 's' }],
          },
          folder,
          { auth, action: 'find', status: 'published', locale: 'en' }
        )) as { notes: Array<Record<string, unknown>> };

        expect(matcher).not.toHaveBeenCalled();
        expect(result.notes[0]).toMatchObject({ title: 't' });
        expect(result.notes[0]).not.toHaveProperty('secret');
      });
    });

    it('asks an inactive checker nothing but isActive', async () => {
      const checker = checkerOf({}, { isActive: vi.fn(() => false) });
      const { sanitize } = apiOf(checker);

      expect(await sanitize.output(entry(), note, { auth, action: 'find' })).toMatchObject({
        secret: 's',
      });
      expect(checker.fieldsFor).not.toHaveBeenCalled();
    });
  });

  describe('input', () => {
    const CREATE = ['title', 'body', 'seo.metaTitle'];
    const table = {
      [`create|${NOTE_UID}`]: { always: CREATE, conditional: [] },
      [`update|${NOTE_UID}`]: { always: ['body'], conditional: [] },
    };

    it('strips a field outside the create list, and keeps the allowed component sub-path', async () => {
      const { sanitize } = apiOf(checkerOf(table));

      expect(
        await sanitize.input(
          {
            title: 't',
            internalNotes: 'x',
            seo: { metaTitle: 'm', metaDescription: 'd' },
          },
          note,
          { auth, action: 'create' }
        )
      ).toEqual({ title: 't', seo: { metaTitle: 'm' } });
    });

    it('answers 400 naming the field when create sends one outside the create list', async () => {
      const { validate } = apiOf(checkerOf(table));

      const error = await rejection(() =>
        validate.input({ title: 't', internalNotes: 'x' }, note, { auth, action: 'create' })
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('internalNotes');
      expect(error.details).toMatchObject({ key: 'internalNotes', source: 'body' });
    });

    it('accepts a field on create and refuses it on update: the lists differ', async () => {
      const { validate } = apiOf(checkerOf(table));

      await expect(
        validate.input({ title: 't' }, note, { auth, action: 'create' })
      ).resolves.toBeUndefined();

      const error = await rejection(() =>
        validate.input({ title: 't' }, note, { auth, action: 'update' })
      );

      expect(error.message).toContain('title');
      await expect(
        validate.input({ body: 'b' }, note, { auth, action: 'update' })
      ).resolves.toBeUndefined();
    });

    it('refuses a component sub-path the list does not name', async () => {
      const { validate } = apiOf(checkerOf(table));

      const error = await rejection(() =>
        validate.input({ seo: { metaDescription: 'd' } }, note, { auth, action: 'create' })
      );

      expect(error.message).toContain('metaDescription');
    });

    it('keeps a stamped key that is not on the create list', async () => {
      const stamp = { owner: { set: [{ documentId: 'u1' }] } };
      const checker = checkerOf(table, { stampFor: vi.fn(() => ({ ...stamp })) });
      const { sanitize } = apiOf(checker);

      // The field rules leave it, and the stamp is merged last
      expect(
        await sanitize.input({ title: 't', internalNotes: 'x' }, note, { auth, action: 'create' })
      ).toEqual({ title: 't', ...stamp });
    });

    it('never removes a key of the stamp: the visitor leaves it where the body has it', async () => {
      const owner = { set: [{ documentId: 'u1' }] };
      const checker = checkerOf(table, { stampFor: vi.fn(() => ({ owner })) });

      const kept = await traverseEntity(
        visitors.removeUnauthorizedFields(checker, auth, 'create'),
        { schema: note, getModel },
        { title: 't', owner, internalNotes: 'x' }
      );

      expect(kept).toEqual({ title: 't', owner });

      // An update that creates (a new locale) is stamped too
      const updateKept = await traverseEntity(
        visitors.removeUnauthorizedFields(checker, auth, 'update', { creates: true }),
        { schema: note, getModel },
        { body: 'b', title: 't', owner }
      );

      expect(updateKept).toEqual({ body: 'b', owner });
    });

    it('does not refuse a stamped key either: validation refuses it with its own reason', async () => {
      const checker = checkerOf(table, { stampFor: vi.fn(() => ({ owner: { set: [] } })) });
      const { validate } = apiOf(checker);

      const error = await rejection(() =>
        validate.input({ owner: { set: [] } }, note, { auth, action: 'create' })
      );

      expect(error.message).toContain('set by the server');
    });

    it('checks the root entry only: what a relation names is an operation on it', async () => {
      const { validate } = apiOf(checkerOf(table));

      await expect(
        validate.input({ title: 't', folder: { connect: [{ documentId: 'f1' }] } }, note, {
          auth,
          action: 'create',
        })
      ).rejects.toThrow('folder');

      const open = apiOf(
        checkerOf({
          [`create|${NOTE_UID}`]: { always: ['title', 'folder'], conditional: [] },
        }),
        // the folder it links to is one the caller may read
        async ({ documentIds }) => documentIds
      );

      await expect(
        open.validate.input({ title: 't', folder: { connect: [{ documentId: 'f1' }] } }, note, {
          auth,
          action: 'create',
        })
      ).resolves.toBeUndefined();
    });

    describe('an update held to the fields of the entry it writes', () => {
      const OWN = { owner: { documentId: 'u1' } };
      const rules: FieldRules = {
        always: [],
        conditional: [
          { filter: OWN, fields: ['title', 'body'] },
          { filter: { folder: { label: 'x' } }, fields: ['title'] },
        ],
      };

      it('gives the fields every group has when the entry is not known', async () => {
        const { validate } = apiOf(checkerOf({ [`update|${NOTE_UID}`]: rules }));

        await expect(
          validate.input({ title: 't' }, note, { auth, action: 'update' })
        ).resolves.toBeUndefined();
        await expect(
          validate.input({ body: 'b' }, note, { auth, action: 'update' })
        ).rejects.toThrow('body');
      });

      it('resolves which groups the entry matches when it has a document id', async () => {
        const matcher = vi.fn<EntryMatcher>(async ({ filter }) => (filter === OWN ? ['n1'] : []));
        const { validate, sanitize } = apiOf(checkerOf({ [`update|${NOTE_UID}`]: rules }), matcher);

        await expect(
          validate.input({ title: 't', body: 'b' }, note, {
            auth,
            action: 'update',
            documentId: 'n1',
          })
        ).resolves.toBeUndefined();
        expect(matcher).toHaveBeenCalledWith({
          uid: NOTE_UID,
          documentIds: ['n1'],
          filter: OWN,
          status: 'draft',
        });
        expect(
          await sanitize.input({ title: 't', body: 'b', secret: 's' }, note, {
            auth,
            action: 'update',
            documentId: 'n1',
          })
        ).toEqual({ title: 't', body: 'b' });
      });

      it('asks in the locale the request writes, and never in all of them', async () => {
        const matcher = vi.fn<EntryMatcher>(async ({ locale }) => (locale === 'en' ? ['n1'] : []));
        const { validate } = apiOf(checkerOf({ [`update|${NOTE_UID}`]: rules }), matcher);

        // The condition holds in English only
        await expect(
          validate.input({ title: 't', body: 'b' }, note, {
            auth,
            action: 'update',
            documentId: 'n1',
            locale: 'en',
          })
        ).resolves.toBeUndefined();
        await expect(
          validate.input({ title: 't', body: 'b' }, note, {
            auth,
            action: 'update',
            documentId: 'n1',
            locale: 'fr',
          })
        ).rejects.toThrow('title');

        expect(matcher.mock.calls.map(([query]) => query.locale)).toEqual(
          expect.arrayContaining(['en', 'fr'])
        );
        expect(matcher.mock.calls.every(([query]) => query.locale !== '*')).toBe(true);
      });

      it('holds a write to the fields every group has when it names no one entry', async () => {
        const matcher = vi.fn<EntryMatcher>(async () => ['n1']);
        const { validate } = apiOf(checkerOf({ [`update|${NOTE_UID}`]: rules }), matcher);

        // Several locales, or a locale the update creates in: the entry is not there to ask about
        for (const extra of [{ locale: '*' }, { creates: true, locale: 'fr' }]) {
          await expect(
            validate.input({ body: 'b' }, note, {
              auth,
              action: 'update',
              documentId: 'n1',
              ...extra,
            })
          ).rejects.toThrow('body');
        }

        expect(matcher).not.toHaveBeenCalled();
      });

      it('asks nothing for one group and no unconditioned row: the stored-entry check matched it', async () => {
        const matcher = vi.fn<EntryMatcher>(async () => []);
        const { validate } = apiOf(
          checkerOf({
            [`update|${NOTE_UID}`]: {
              always: [],
              conditional: [{ filter: OWN, fields: ['body'] }],
            },
          }),
          matcher
        );

        await expect(
          validate.input({ body: 'b' }, note, { auth, action: 'update', documentId: 'n1' })
        ).resolves.toBeUndefined();
        expect(matcher).not.toHaveBeenCalled();
      });

      it('gives one group`s fields when it is the only one', async () => {
        const { validate } = apiOf(
          checkerOf({
            [`update|${NOTE_UID}`]: {
              always: [],
              conditional: [{ filter: OWN, fields: ['body'] }],
            },
          })
        );

        await expect(
          validate.input({ body: 'b' }, note, { auth, action: 'update' })
        ).resolves.toBeUndefined();
        await expect(
          validate.input({ title: 't' }, note, { auth, action: 'update' })
        ).rejects.toThrow('title');
      });
    });

    it('asks an inactive checker nothing but isActive', async () => {
      const checker = checkerOf({}, { isActive: vi.fn(() => false) });
      const { sanitize, validate } = apiOf(checker);

      await sanitize.input({ title: 't', secret: 's' }, note, { auth, action: 'create' });
      await validate.input({ title: 't', secret: 's' }, note, { auth, action: 'update' });

      expect(checker.fieldsFor).not.toHaveBeenCalled();
    });
  });

  describe('queries', () => {
    const table = {
      [`find|${NOTE_UID}`]: { always: NOTE_FIND, conditional: [] },
      // folder's find fields exclude `name`
      [`find|${FOLDER_UID}`]: { always: ['label', 'notes'], conditional: [] },
    };

    describe('sanitize', () => {
      it('drops a filter on a field the find fields hide, and keeps the others', async () => {
        const { sanitize } = apiOf(checkerOf(table));

        expect(
          await sanitize.filters({ title: { $eq: 'a' }, secret: { $eq: 'x' } }, note, {
            auth,
            action: 'find',
          })
        ).toEqual({ title: { $eq: 'a' } });
      });

      it('drops a filter through a relation on a field of the target it hides', async () => {
        const { sanitize } = apiOf(checkerOf(table));

        expect(
          await sanitize.filters({ folder: { name: { $eq: 'a' } } }, note, { auth, action: 'find' })
        ).toEqual({ folder: {} });
        expect(
          await sanitize.filters({ folder: { label: { $eq: 'a' } } }, note, {
            auth,
            action: 'find',
          })
        ).toEqual({ folder: { label: { $eq: 'a' } } });
      });

      it('drops a sort and a populate the fields hide', async () => {
        const { sanitize } = apiOf(checkerOf(table));

        expect(
          JSON.stringify((await sanitize.sort('secret:asc', note, { auth, action: 'find' })) ?? '')
        ).not.toContain('secret');
        expect(await sanitize.sort('title:asc', note, { auth, action: 'find' })).toBe('title:asc');
        expect(await sanitize.sort('createdAt:desc', note, { auth, action: 'find' })).toBe(
          'createdAt:desc'
        );
        expect(await sanitize.populate({ folder: true }, note, { auth, action: 'find' })).toEqual({
          folder: true,
        });
        expect(
          await sanitize.populate({ folder: { populate: { notes: true } }, owner: true }, note, {
            auth,
            action: 'find',
          })
        ).toEqual({ folder: { populate: { notes: true } }, owner: true });
      });

      it('reads the filters and sort of a populate node by the target`s own fields', async () => {
        const { sanitize } = apiOf(checkerOf(table));

        const populate = await sanitize.populate(
          {
            folder: {
              filters: { name: { $eq: 'x' }, label: { $eq: 'y' } },
              sort: ['name:asc'],
            },
          },
          note,
          { auth, action: 'find' }
        );

        expect(populate).toEqual({
          folder: { filters: { label: { $eq: 'y' } }, sort: [] },
        });
      });

      it('drops `_q` unless every field of the type is queryable', async () => {
        const { sanitize } = apiOf(checkerOf(table));
        const everyField = apiOf(
          checkerOf({
            [`find|${NOTE_UID}`]: { always: Object.keys(note.attributes), conditional: [] },
          })
        );

        expect(
          await sanitize.query({ _q: 'x', sort: 'title:asc' }, note, { auth, action: 'find' })
        ).not.toHaveProperty('_q');
        expect(
          await everyField.sanitize.query({ _q: 'x' }, note, { auth, action: 'find' })
        ).toHaveProperty('_q', 'x');
      });

      it('leaves `fields=` naming a hidden field alone: the output strips it', async () => {
        const { sanitize } = apiOf(checkerOf(table));

        expect(await sanitize.fields(['title', 'secret'], note, { auth, action: 'find' })).toEqual([
          'title',
          'secret',
        ]);
      });

      it('queries a write action by the read fields of its response', async () => {
        const checker = checkerOf({
          [`find|${NOTE_UID}`]: { always: ['title'], conditional: [] },
          [`findOne|${NOTE_UID}`]: { always: ['title', 'secret'], conditional: [] },
        });
        const { sanitize } = apiOf(checker);

        expect(
          await sanitize.filters({ secret: { $eq: 'x' } }, note, { auth, action: 'update' })
        ).toEqual({ secret: { $eq: 'x' } });
        expect(checker.fieldsFor).toHaveBeenCalledWith(auth, 'findOne', NOTE_UID);
      });
    });

    describe('validate', () => {
      it.each([
        [
          'filters[secret][$eq]=x',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.filters({ secret: { $eq: 'x' } }, note, { auth, action: 'find' }),
          'filters',
        ],
        [
          'sort=secret',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.sort('secret', note, { auth, action: 'find' }),
          'sort',
        ],
        [
          'populate[folder][filters][name]=x',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.populate({ folder: { filters: { name: { $eq: 'x' } } } }, note, {
              auth,
              action: 'find',
            }),
          'populate',
        ],
        [
          'populate[folder][sort]=name',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.populate({ folder: { sort: 'name' } }, note, { auth, action: 'find' }),
          'populate',
        ],
        [
          'populate[folder][populate][notes][populate][secret]=true',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.populate(
              { folder: { populate: { notes: { populate: { internalNotes: true } } } } },
              note,
              { auth, action: 'find' }
            ),
          'populate',
        ],
        [
          'populate=internalNotes',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.populate('internalNotes', note, { auth, action: 'find' }),
          'populate',
        ],
        [
          '_q=x',
          (v: ReturnType<typeof apiOf>['validate']) =>
            v.query({ _q: 'x' }, note, { auth, action: 'find' }),
          '_q',
        ],
      ])('answers 400 to %s', async (_name, run, param) => {
        const { validate } = apiOf(checkerOf(table));

        const error = await rejection(() => run(validate));

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details).toMatchObject({ source: 'query', param });
      });

      it('names the field it refuses', async () => {
        const { validate } = apiOf(checkerOf(table));

        const error = await rejection(() =>
          validate.filters({ folder: { name: { $eq: 'x' } } }, note, { auth, action: 'find' })
        );

        expect(error.message).toContain('name');
      });

      it('lets through what the fields allow, the always-readable ones included', async () => {
        const { validate } = apiOf(checkerOf(table));

        await validate.filters(
          { title: { $eq: 'a' }, folder: { label: { $eq: 'x' } }, createdAt: { $gt: '2020' } },
          note,
          { auth, action: 'find' }
        );
        await validate.sort(['title:asc', 'createdAt:desc'], note, { auth, action: 'find' });
        await validate.populate(
          { folder: { filters: { label: { $eq: 'x' } }, populate: { notes: true } } },
          note,
          { auth, action: 'find' }
        );
        await validate.fields(['secret'], note, { auth, action: 'find' });
      });

      it('lets `_q` through when every field is queryable', async () => {
        const { validate } = apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: { always: null, conditional: [] } })
        );

        await validate.query({ _q: 'x' }, note, { auth, action: 'find' });
      });

      it('queries by the fields of the one conditioned group', async () => {
        const { validate } = apiOf(
          checkerOf({
            [`find|${NOTE_UID}`]: {
              always: [],
              conditional: [
                { filter: { owner: { documentId: 'u1' } }, fields: ['title', 'owner'] },
              ],
            },
          })
        );

        await validate.filters({ title: { $eq: 'a' } }, note, { auth, action: 'find' });
        await expect(
          validate.filters({ body: { $eq: 'a' } }, note, { auth, action: 'find' })
        ).rejects.toThrow('body');
      });

      it('queries no field when no row gives one', async () => {
        const { validate } = apiOf(
          checkerOf({ [`find|${NOTE_UID}`]: { always: [], conditional: [] } })
        );

        await expect(
          validate.filters({ title: { $eq: 'a' } }, note, { auth, action: 'find' })
        ).rejects.toThrow('title');
      });

      it('asks an inactive checker nothing but isActive', async () => {
        const checker = checkerOf({}, { isActive: vi.fn(() => false) });
        const { validate, sanitize } = apiOf(checker);

        await validate.filters({ secret: { $eq: 'x' } }, note, { auth, action: 'find' });
        await validate.query({ _q: 'x' }, note, { auth, action: 'find' });
        await sanitize.query({ _q: 'x', sort: 'secret' }, note, { auth, action: 'find' });

        expect(checker.fieldsFor).not.toHaveBeenCalled();
      });
    });
  });
});
