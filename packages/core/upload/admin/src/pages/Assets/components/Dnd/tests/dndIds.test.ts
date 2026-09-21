import { HOME_TREE_TARGET_ID, parseFolderTreeTargetId, toFolderTreeTargetId } from '../dndIds';

describe('folder-tree-target dnd ids', () => {
  it('builds a tree target id from a folder id', () => {
    expect(toFolderTreeTargetId(42)).toBe('folder-tree-target:42');
  });

  it('parses a folder id from a tree target id', () => {
    expect(parseFolderTreeTargetId('folder-tree-target:7')).toBe(7);
  });

  it('parses home as root', () => {
    expect(parseFolderTreeTargetId(HOME_TREE_TARGET_ID)).toBe('root');
  });

  it('returns null for the in-view folder-target namespace', () => {
    expect(parseFolderTreeTargetId('folder-target:3')).toBeNull();
  });

  it('returns null for garbage ids', () => {
    expect(parseFolderTreeTargetId('not-a-target')).toBeNull();
    expect(parseFolderTreeTargetId(123)).toBeNull();
  });
});
