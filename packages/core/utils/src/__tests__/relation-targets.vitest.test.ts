import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PermissionChecker } from '../content-api-permissions';
import type { EntryMatcher } from '../field-rules';
import { createAPIValidators } from '../validate';
import { ValidationError } from '../errors';
import type { Model } from '../types';

const FOLDER_UID = 'api::folder.folder';
const NOTE_UID = 'api::note.note';

const note = {
  uid: NOTE_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER_UID, inversedBy: 'notes' },
  },
} satisfies Model;

const folder = {
  uid: FOLDER_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'folder', pluralName: 'folders', displayName: 'Folder' },
  options: {},
  attributes: {
    name: { type: 'string' },
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE_UID, mappedBy: 'folder' },
    pinned: { type: 'relation', relation: 'oneToOne', target: NOTE_UID },
  },
} satisfies Model;

const models: Record<string, Model> = { [folder.uid]: folder, [note.uid]: note };
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

/** The caller's own notes: the only ones its `find` condition lets it read */
const OWN = { owner: { documentId: { $eq: 'me' } } };
const DRAFTS = { owner: { documentId: { $eq: 'me' } }, kind: 'drafts' };

const checkerOf = (overrides: Partial<PermissionChecker> = {}) => {
  const checker = {
    isActive: vi.fn(() => true),
    filtersFor: vi.fn((_auth: unknown, action: string) =>
      action === 'read-drafts' ? DRAFTS : OWN
    ),
    canReadDrafts: vi.fn(() => false),
    fieldsFor: vi.fn(() => ({ always: null, conditional: [] })),
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

/**
 * The database, as the matcher sees it: `mine-published` is the caller's and published,
 * `mine-draft` the caller's and never published, `theirs` another user's and published.
 */
const matcherOf = () =>
  vi.fn<EntryMatcher>(async ({ documentIds, filter, status }) => {
    const rows = [
      { documentId: 'mine-published', mine: true, status: 'published' },
      { documentId: 'mine-draft', mine: true, status: 'draft' },
      { documentId: 'theirs', mine: false, status: 'published' },
    ];
    const ownOnly = JSON.stringify(filter).includes('"me"');

    return rows
      .filter((row) => documentIds.includes(row.documentId))
      .filter((row) => (status === undefined ? true : row.status === status))
      .filter((row) => !ownOnly || row.mine)
      .map((row) => row.documentId);
  });

const validateOf = (checker: PermissionChecker, matchEntries: EntryMatcher = matcherOf()) =>
  createAPIValidators({ getModel, permissions: checker, matchEntries });

const rejection = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return error as ValidationError;
  }

  throw new Error('did not throw');
};

describe('Content API permissions: the entries a write links to', () => {
  beforeEach(() => {
    // The relation visitors ask `strapi.auth.verify` whether the caller may read the target type
    (globalThis as unknown as { strapi: unknown }).strapi = {
      contentTypes: models,
      components: {},
      getModel,
      auth: { verify: () => true },
    };
  });

  const write = (data: unknown, checker = checkerOf(), matcher?: EntryMatcher) =>
    validateOf(checker, matcher).input(data, folder, { auth, action: 'create' });

  it('refuses to connect an entry the caller may not read, as if it did not exist', async () => {
    const error = await rejection(() => write({ notes: { connect: ['theirs'] } }));

    expect(error).toBeInstanceOf(ValidationError);
    // the message core gives a document that is not there: a refusal tells nothing more
    expect(error.message).toBe('Document with id "theirs", locale "null" not found');
  });

  it('lets an entry the caller may read through', async () => {
    await expect(write({ notes: { connect: ['mine-published'] } })).resolves.toBeUndefined();
  });

  it.each([
    ['set', { notes: { set: ['theirs'] } }],
    ['a list', { notes: ['theirs'] }],
    ['an object with a documentId', { notes: { connect: [{ documentId: 'theirs' }] } }],
    ['a single id on a to-one relation', { pinned: 'theirs' }],
    ['a single object on a to-one relation', { pinned: { documentId: 'theirs' } }],
  ])('checks %s', async (_name, data) => {
    const error = await rejection(() => write(data));

    expect(error.message).toMatch(/Document with id "theirs"/);
  });

  it('does not check disconnect: unlinking changes only the entry written', async () => {
    await expect(write({ notes: { disconnect: ['theirs'] } })).resolves.toBeUndefined();
  });

  it('reads a draft only under read-drafts', async () => {
    const without = await rejection(() => write({ notes: { connect: ['mine-draft'] } }));

    expect(without.message).toMatch(/Document with id "mine-draft"/);

    const checker = checkerOf({ canReadDrafts: vi.fn(() => true) });
    const matcher = matcherOf();

    await expect(
      write({ notes: { connect: ['mine-draft'] } }, checker, matcher)
    ).resolves.toBeUndefined();
    expect(matcher).toHaveBeenCalledWith(
      expect.objectContaining({ uid: NOTE_UID, status: 'draft', filter: DRAFTS })
    );
  });

  it('refuses every target when the caller holds a find row that allows none', async () => {
    const matcher = matcherOf();
    const checker = checkerOf({ filtersFor: vi.fn(() => null) });

    const error = await rejection(() =>
      write({ notes: { connect: ['mine-published'] } }, checker, matcher)
    );

    expect(error.message).toMatch(/Document with id "mine-published"/);
    expect(matcher).not.toHaveBeenCalled();
  });

  it('refuses a target named by its numeric id, which no condition can be checked on', async () => {
    const error = await rejection(() => write({ notes: { connect: [{ id: 3 }] } }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toMatch(/documentId/);
  });

  it('checks nothing for a caller whose ability carries no data rules', async () => {
    const matcher = matcherOf();
    const checker = checkerOf({ isActive: vi.fn(() => false) });

    await expect(
      write({ notes: { connect: ['theirs', { id: 3 }] } }, checker, matcher)
    ).resolves.toBeUndefined();
    expect(matcher).not.toHaveBeenCalled();
  });
});
