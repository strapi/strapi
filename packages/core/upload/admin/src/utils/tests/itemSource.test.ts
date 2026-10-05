import { hasUniformSource, sourceFolderIdOf, uniformSourceFolderId } from '../itemSource';

import type { DragItemData } from '../../types/dnd';

const file = (id: number, folderId: number | null): DragItemData => ({
  kind: 'file',
  id,
  name: `file-${id}.png`,
  folderId,
});

const folder = (id: number, parentId: number | null): DragItemData => ({
  kind: 'folder',
  id,
  name: `folder-${id}`,
  parentId,
});

describe('sourceFolderIdOf', () => {
  it('reads a file’s location off folderId', () => {
    expect(sourceFolderIdOf(file(10, 4))).toBe(4);
  });

  it('reads a folder’s location off parentId, not its own id', () => {
    expect(sourceFolderIdOf(folder(3, 8))).toBe(8);
  });

  it('reports a root-level item as null', () => {
    expect(sourceFolderIdOf(file(10, null))).toBeNull();
    expect(sourceFolderIdOf(folder(3, null))).toBeNull();
  });
});

describe('hasUniformSource', () => {
  it('is false for an empty set — there is nothing to name', () => {
    expect(hasUniformSource([])).toBe(false);
  });

  it('is true for a single item', () => {
    expect(hasUniformSource([file(10, 4)])).toBe(true);
  });

  it('is true when every item shares a folder', () => {
    expect(hasUniformSource([file(10, 4), file(20, 4), folder(3, 4)])).toBe(true);
  });

  it('is true when every item sits at the root', () => {
    expect(hasUniformSource([file(10, null), folder(3, null)])).toBe(true);
  });

  it('is false when the set spans folders', () => {
    expect(hasUniformSource([file(10, 4), file(20, 5)])).toBe(false);
  });

  it('treats the root as distinct from any folder', () => {
    expect(hasUniformSource([file(10, null), file(20, 5)])).toBe(false);
  });

  it('compares a folder’s parent against a file’s folder for mixed kinds', () => {
    expect(hasUniformSource([file(10, 4), folder(3, 4)])).toBe(true);
    expect(hasUniformSource([file(10, 4), folder(3, 5)])).toBe(false);
  });
});

describe('uniformSourceFolderId', () => {
  it('returns the shared folder when the set agrees', () => {
    expect(uniformSourceFolderId([file(10, 4), folder(3, 4)])).toBe(4);
  });

  it('returns null for a set that spans folders', () => {
    expect(uniformSourceFolderId([file(10, 4), file(20, 5)])).toBeNull();
  });

  it('returns null for an empty set', () => {
    expect(uniformSourceFolderId([])).toBeNull();
  });

  it('returns null for a uniformly root-level set', () => {
    // Same value as the spanning case — callers that must tell "the root" from
    // "no single source" pair this with hasUniformSource.
    expect(uniformSourceFolderId([file(10, null), folder(3, null)])).toBeNull();
    expect(hasUniformSource([file(10, null), folder(3, null)])).toBe(true);
  });
});
