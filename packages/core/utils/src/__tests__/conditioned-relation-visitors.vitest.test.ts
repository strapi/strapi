import { describe, expect, it, vi } from 'vitest';

import {
  throwConditionedRelationSort,
  throwConditionedRelationUnderNot,
} from '../validate/visitors';
import { traverseQueryFilters, traverseQuerySort } from '../traverse';
import { ValidationError } from '../errors';
import type { Model } from '../types';

const NOTE_UID = 'api::note.note';
const FOLDER_UID = 'api::folder.folder';
const TAG_UID = 'api::tag.tag';

const note = {
  uid: NOTE_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: {},
  attributes: {
    title: { type: 'string' },
    folder: { type: 'relation', relation: 'manyToOne', target: FOLDER_UID },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
    related: { type: 'relation', relation: 'morphToMany' },
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

const tag = {
  uid: TAG_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'tag', pluralName: 'tags', displayName: 'Tag' },
  options: {},
  attributes: { label: { type: 'string' } },
} satisfies Model;

const models: Record<string, Model> = { [NOTE_UID]: note, [FOLDER_UID]: folder, [TAG_UID]: tag };
const getModel = (uid: string) => models[uid];
const ctx = { schema: note, getModel };

/** The caller's rules restrict reading folders, and nothing else */
const foldersRestricted = (uid: string) => uid === FOLDER_UID;

describe('throwConditionedRelationUnderNot', () => {
  const run = (filters: unknown, isRestricted = foldersRestricted) =>
    traverseQueryFilters(throwConditionedRelationUnderNot(isRestricted), ctx, filters as object);

  it('refuses a filter on a restricted to-many relation under a $not', async () => {
    const filters = { folder: { notes: { id: { $notNull: true } } } };

    await expect(run({ $not: filters })).rejects.toThrow(ValidationError);
    await expect(run({ $not: filters })).rejects.toThrow(
      'filtering through this relation inside $not is not allowed'
    );
  });

  it('refuses a restricted relation under a $not even when it is to-one', async () => {
    // A condition's own filter can join a to-many relation and multiply the rows
    await expect(run({ $not: { folder: { name: 'a' } } })).rejects.toThrow(ValidationError);
  });

  it('refuses a $not nested in $and and $or, and one that has a list index', async () => {
    await expect(run({ $and: [{ $or: [{ $not: { folder: { name: 'a' } } }] }] })).rejects.toThrow(
      ValidationError
    );
    await expect(run({ $not: [{ folder: { name: 'a' } }] })).rejects.toThrow(ValidationError);
  });

  it('refuses a $not that sits above the restricted relation at any depth', async () => {
    await expect(run({ $not: { tags: { label: 'x' }, folder: { name: 'a' } } })).rejects.toThrow(
      ValidationError
    );
  });

  it('names the key and the path of the relation it refuses', async () => {
    const error = await run({ $not: { folder: { name: 'a' } } }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toMatchObject({ key: 'folder', path: 'folder' });
  });

  it('passes a restricted relation that no $not sits above', async () => {
    await expect(run({ folder: { notes: { id: { $notNull: true } } } })).resolves.toBeDefined();
    await expect(run({ $and: [{ folder: { name: 'a' } }] })).resolves.toBeDefined();
  });

  it('passes an unrestricted relation under a $not', async () => {
    await expect(run({ $not: { tags: { label: 'x' } } })).resolves.toBeDefined();
  });

  it('passes a $not on a scalar and a filter without relations', async () => {
    await expect(run({ $not: { title: 'a' } })).resolves.toBeDefined();
    await expect(run({ title: { $not: { $eq: 'a' } } })).resolves.toBeDefined();
  });

  it('does not take a key that only starts with $not for a $not', async () => {
    await expect(run({ $notIn: [], folder: { name: 'a' } })).resolves.toBeDefined();
  });

  it('is not asked about a morph relation', async () => {
    const isRestricted = vi.fn(() => true);

    await expect(
      run({ $not: { related: { id: { $notNull: true } } } }, isRestricted)
    ).resolves.toBeDefined();
    expect(isRestricted).not.toHaveBeenCalled();
  });

  it('asks about the target uid of the relation, with the path it visits', async () => {
    const isRestricted = vi.fn(() => false);

    await run({ $not: { folder: { name: 'a' } } }, isRestricted);

    expect(isRestricted).toHaveBeenCalledWith(
      FOLDER_UID,
      expect.objectContaining({ attribute: 'folder' })
    );
  });
});

describe('throwConditionedRelationSort', () => {
  const run = (sort: unknown, isRestricted = foldersRestricted, schema: Model = note) =>
    traverseQuerySort(throwConditionedRelationSort(isRestricted), { schema, getModel }, sort);

  it('refuses a sort through a restricted relation, as a string, a list and an object', async () => {
    await expect(run('folder.name:asc')).rejects.toThrow(ValidationError);
    await expect(run(['title:asc', 'folder.name:desc'])).rejects.toThrow(ValidationError);
    await expect(run({ folder: { name: 'asc' } })).rejects.toThrow(ValidationError);
    await expect(run('folder.name:asc')).rejects.toThrow(
      'sorting through this relation is not allowed'
    );
  });

  it('refuses a sort that reaches the restricted relation from a related type', async () => {
    const isRestricted = (uid: string) => uid === NOTE_UID;

    await expect(run('folder.notes.title:asc', isRestricted)).rejects.toThrow(ValidationError);
  });

  it('starts from the schema it is given', async () => {
    await expect(run('notes.title:asc', foldersRestricted, folder)).resolves.toBeDefined();
    await expect(run('notes.folder.name:asc', foldersRestricted, folder)).rejects.toThrow(
      ValidationError
    );
  });

  it('names the key and the path of the relation it refuses', async () => {
    const error = await run('folder.name:asc').catch((e) => e);

    expect(error.details).toMatchObject({ key: 'folder', path: 'folder' });
  });

  it('passes a sort through an unrestricted relation', async () => {
    await expect(run('tags.label:asc')).resolves.toBeDefined();
  });

  it('passes a sort on the entries own scalar fields', async () => {
    await expect(run('title:asc')).resolves.toBeDefined();
    await expect(run(['title:asc', 'id:desc'])).resolves.toBeDefined();
  });

  it('passes every sort when no relation is restricted', async () => {
    await expect(run('folder.name:asc', () => false)).resolves.toBeDefined();
  });

  it('is not asked about a morph relation', async () => {
    const isRestricted = vi.fn(() => true);

    await expect(run('related.id:asc', isRestricted)).resolves.toBeDefined();
    expect(isRestricted).not.toHaveBeenCalled();
  });
});
