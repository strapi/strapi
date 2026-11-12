import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PermissionChecker } from '../content-api-permissions';
import { createAPIValidators } from '../validate';
import { createAPISanitizers } from '../sanitize';
import {
  assertPopulateDepth,
  cutPopulateDepth,
  splitPopulateLists,
} from '../validate/populate-depth';
import { ValidationError } from '../errors';
import type { Model } from '../types';

const NOTE_UID = 'api::note.note';
const FOLDER_UID = 'api::folder.folder';

const note = {
  uid: NOTE_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: {},
  attributes: {
    title: { type: 'string' },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER_UID },
    archive: { type: 'relation', relation: 'manyToOne', target: FOLDER_UID },
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
    notes: { type: 'relation', relation: 'oneToMany', target: NOTE_UID },
  },
} satisfies Model;

const models: Record<string, Model> = { [NOTE_UID]: note, [FOLDER_UID]: folder };
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

const checkerOf = (depth: number | null, overrides: Partial<PermissionChecker> = {}) => {
  const checker = {
    isActive: vi.fn(() => true),
    filtersFor: vi.fn(() => ({})),
    canReadDrafts: vi.fn(() => true),
    fieldsFor: vi.fn(() => ({ always: null, conditional: [] })),
    readableFields: vi.fn(() => null),
    writableFields: vi.fn(() => null),
    lockedFields: vi.fn(() => []),
    stampFor: vi.fn(() => ({})),
    populateDepth: vi.fn(() => depth),
    record: vi.fn(),
    ...overrides,
  };

  return checker as unknown as PermissionChecker & typeof checker;
};

const run = (populate: unknown, depth: number | null, action?: string) =>
  assertPopulateDepth(populate, note, { auth, action, checker: checkerOf(depth), getModel });

const refusal = (populate: unknown, depth: number | null) => {
  try {
    run(populate, depth);
  } catch (error) {
    return error as ValidationError;
  }

  throw new Error('did not throw');
};

describe('Content API permissions: the populate depth of a role', () => {
  beforeEach(() => {
    (globalThis as unknown as { strapi: unknown }).strapi = {
      contentTypes: models,
      components: {},
      getModel,
      auth: { verify: () => true },
    };
  });

  it('accepts a populate within the limit', () => {
    expect(() => run('folder', 1)).not.toThrow();
    expect(() => run({ folder: true }, 1)).not.toThrow();
    expect(() => run(['folder'], 1)).not.toThrow();
    expect(() => run({ folder: { populate: { notes: true } } }, 2)).not.toThrow();
  });

  it('answers 400 beyond the limit, naming the type and the limit', () => {
    const error = refusal({ folder: { populate: { notes: true } } }, 1);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Populate depth 2 exceeds the limit of 1 for api::note.note');
    expect(error.details).toEqual({ source: 'query', param: 'populate' });
  });

  it('counts a dotted path level by level', () => {
    expect(() => run('folder.notes', 2)).not.toThrow();
    expect(refusal('folder.notes', 1).message).toContain('depth 2');
    expect(refusal(['folder', 'folder.notes.folder'], 2).message).toContain('depth 3');
  });

  it('counts a comma list path by path, as the Document Service splits it', () => {
    // Two paths of two levels, not one of three (`folder`, `notes,folder`, `notes`)
    expect(() => run('folder.notes,folder.notes', 2)).not.toThrow();
    expect(() => run('folder.notes, folder', 2)).not.toThrow();
    expect(() => run(['folder.notes,folder'], 2)).not.toThrow();
    expect(() => run({ folder: { populate: 'notes,notes' } }, 2)).not.toThrow();
    expect(refusal('folder, folder.notes', 1).message).toContain('depth 2');
    expect(refusal({ folder: { populate: 'notes, notes.folder' } }, 2).message).toContain(
      'depth 3'
    );
    // Empty parts are dropped
    expect(() => run('folder,,', 1)).not.toThrow();
  });

  it('splits comma lists at every level, trimmed, empties dropped, and leaves the rest', () => {
    expect(splitPopulateLists('folder, folder.notes,')).toEqual(['folder', 'folder.notes']);
    expect(splitPopulateLists(['a,b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(splitPopulateLists('folder')).toBe('folder');
    expect(splitPopulateLists('*')).toBe('*');
    expect(
      splitPopulateLists({
        folder: { populate: 'notes,archive', fields: ['name'] },
        blocks: { on: { 'shared.hero': { populate: 'image, link' } } },
        other: true,
      })
    ).toEqual({
      folder: { populate: ['notes', 'archive'], fields: ['name'] },
      blocks: { on: { 'shared.hero': { populate: ['image', 'link'] } } },
      other: true,
    });
  });

  it('counts * as one level', () => {
    expect(() => run('*', 1)).not.toThrow();
    expect(refusal('*', 0).message).toContain('depth 1');
    expect(() => run({ folder: { populate: '*' } }, 2)).not.toThrow();
    expect(refusal({ folder: { populate: '*' } }, 1).message).toContain('depth 2');
  });

  it('takes the deepest of several branches', () => {
    expect(
      refusal({ folder: true, other: { populate: { a: { populate: { b: true } } } } }, 2).message
    ).toContain('depth 3');
  });

  it('counts the nested populate of a node, and not its filters, sort or fields', () => {
    expect(() =>
      run(
        {
          folder: {
            filters: { name: { $eq: 'x' } },
            sort: ['name'],
            fields: ['name'],
            count: true,
            populate: {},
          },
        },
        1
      )
    ).not.toThrow();
  });

  it('counts components, dynamic zones and media like relations', () => {
    // A component, then a relation inside it
    expect(refusal({ seo: { populate: { image: true } } }, 1).message).toContain('depth 2');
    // A dynamic zone's components are fragments of one level; what they populate is the next
    expect(() =>
      run({ blocks: { on: { 'shared.hero': { populate: { image: true } } } } }, 2)
    ).not.toThrow();
    expect(
      refusal({ blocks: { on: { 'shared.hero': { populate: { image: true } } } } }, 1).message
    ).toContain('depth 2');
    expect(() => run({ blocks: { on: { 'shared.hero': { filters: {} } } } }, 1)).not.toThrow();
  });

  it('has no limit for null', () => {
    expect(() =>
      run({ a: { populate: { b: { populate: { c: { populate: { d: true } } } } } } }, null)
    ).not.toThrow();
  });

  it('refuses any populate under a limit of 0', () => {
    expect(refusal({ folder: true }, 0).message).toBe(
      'Populate depth 1 exceeds the limit of 0 for api::note.note'
    );
    expect(() => run(undefined, 0)).not.toThrow();
    expect(() => run({}, 0)).not.toThrow();
  });

  it('asks the checker for the read action and the root uid, and its value is the limit', () => {
    for (const [action, readAction] of [
      ['find', 'find'],
      [undefined, 'find'],
      ['custom', 'find'],
      ['findOne', 'findOne'],
      ['create', 'findOne'],
      ['update', 'findOne'],
    ] as const) {
      const checker = checkerOf(2);

      assertPopulateDepth({ folder: true }, note, { auth, action, checker, getModel });

      expect(checker.populateDepth).toHaveBeenCalledWith(auth, readAction, NOTE_UID);
    }

    const tight = checkerOf(1);

    expect(() =>
      assertPopulateDepth('folder.notes', note, { auth, checker: tight, getModel })
    ).toThrow('limit of 1');
  });

  describe('validate.query', () => {
    const api = (checker: PermissionChecker) => ({
      validate: createAPIValidators({ getModel, permissions: checker }),
    });

    it('refuses a deep populate and lets a shallow one through', async () => {
      const { validate } = api(checkerOf(1));

      await validate.query({ populate: { folder: true } }, note, { auth, action: 'find' });
      await validate.query({ populate: 'folder' }, note, { auth, action: 'find' });

      await expect(
        validate.query({ populate: { folder: { populate: { notes: true } } } }, note, {
          auth,
          action: 'find',
        })
      ).rejects.toThrow('Populate depth 2 exceeds the limit of 1 for api::note.note');
    });

    it('counts the wildcard, which the populate checks let through', async () => {
      const { validate } = api(checkerOf(0));

      await expect(
        validate.query({ populate: '*' }, note, { auth, action: 'find' })
      ).rejects.toThrow('Populate depth 1 exceeds the limit of 0');
    });

    it('judges each path of a comma list by the field rules, and sanitizes it path by path', async () => {
      // `archive` is a field the caller's rules hide
      const checker = checkerOf(null, {
        fieldsFor: vi.fn((_auth: unknown, _action: string, uid: string) =>
          uid === NOTE_UID
            ? { always: ['title', 'folder'], conditional: [] }
            : { always: null, conditional: [] }
        ),
      });
      const { validate } = api(checker);
      const sanitize = createAPISanitizers({ getModel, permissions: checker });

      await expect(
        validate.query({ populate: 'folder,archive' }, note, { auth, action: 'find' })
      ).rejects.toThrow('Invalid key archive');
      await validate.query({ populate: 'folder, folder.notes' }, note, { auth, action: 'find' });

      const sanitized = await sanitize.query({ populate: 'folder,archive' }, note, {
        auth,
        action: 'find',
      });

      expect(sanitized.populate).toEqual(['folder']);
    });

    it('asks nothing of an inactive checker, and a query with no populate asks no depth', async () => {
      const inactive = checkerOf(0, { isActive: vi.fn(() => false) });

      await api(inactive).validate.query(
        { populate: { folder: { populate: { notes: true } } } },
        note,
        { auth, action: 'find' }
      );
      expect(inactive.populateDepth).not.toHaveBeenCalled();

      const active = checkerOf(0);

      await api(active).validate.query({ filters: { title: 'a' } }, note, { auth, action: 'find' });
      expect(active.populateDepth).not.toHaveBeenCalled();
    });
  });

  describe('cutPopulateDepth', () => {
    it('keeps what is within the limit, in the shape it came in', () => {
      expect(cutPopulateDepth('*', 1)).toBe('*');
      expect(cutPopulateDepth('folder.notes', 2)).toBe('folder.notes');
      expect(cutPopulateDepth(['folder', 'archive'], 1)).toEqual(['folder', 'archive']);
      expect(cutPopulateDepth({ folder: { populate: { notes: true } } }, 2)).toEqual({
        folder: { populate: { notes: true } },
      });
    });

    it('cuts the paths, lists and nested populates below the limit', () => {
      expect(cutPopulateDepth('folder.notes.folder', 2)).toBe('folder.notes');
      expect(cutPopulateDepth('folder.notes, archive.notes', 1)).toBe('folder,archive');
      expect(cutPopulateDepth(['folder.notes', 'archive'], 1)).toEqual(['folder', 'archive']);
      expect(
        cutPopulateDepth(
          {
            folder: { filters: { name: 'a' }, populate: { notes: { populate: { folder: true } } } },
          },
          2
        )
      ).toEqual({ folder: { filters: { name: 'a' }, populate: { notes: {} } } });
      expect(cutPopulateDepth({ folder: { populate: { notes: true } } }, 1)).toEqual({
        folder: {},
      });
    });

    it('cuts the fragments of a dynamic zone or morph relation by their own populate', () => {
      expect(
        cutPopulateDepth({ blocks: { on: { 'shared.quote': { populate: { author: true } } } } }, 1)
      ).toEqual({ blocks: { on: { 'shared.quote': {} } } });
    });

    it('leaves nothing for a limit of 0', () => {
      expect(cutPopulateDepth({ folder: true }, 0)).toBeUndefined();
      expect(cutPopulateDepth('*', 0)).toBeUndefined();
    });
  });

  describe('sanitize.query', () => {
    const sanitizeOf = (checker: PermissionChecker) =>
      createAPISanitizers({ getModel, permissions: checker });

    it('cuts a populate to the limit the validator would refuse beyond', async () => {
      const sanitize = sanitizeOf(checkerOf(1));

      const sanitized = await sanitize.query(
        { populate: { folder: { populate: { notes: true } } } },
        note,
        { auth, action: 'find' }
      );

      expect(sanitized.populate).toEqual({ folder: {} });
    });

    it('cuts a dotted path', async () => {
      const sanitized = await sanitizeOf(checkerOf(1)).query({ populate: 'folder.notes' }, note, {
        auth,
        action: 'find',
      });

      expect(JSON.stringify(sanitized.populate)).not.toContain('notes');
    });

    it('drops the populate under a limit of 0', async () => {
      const sanitized = await sanitizeOf(checkerOf(0)).query({ populate: { folder: true } }, note, {
        auth,
        action: 'find',
      });

      expect(sanitized).not.toHaveProperty('populate');
    });

    it('changes nothing without a limit, for an inactive checker, or for a populate within it', async () => {
      const populate = { folder: { populate: { notes: true } } };

      for (const checker of [
        checkerOf(null),
        checkerOf(0, { isActive: vi.fn(() => false) }),
        checkerOf(2),
      ]) {
        const sanitized = await sanitizeOf(checker).query({ populate }, note, {
          auth,
          action: 'find',
        });

        expect(JSON.stringify(sanitized.populate)).toContain('notes');
      }
    });
  });
});
