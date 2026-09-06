import { buildItemLocations, emptyItemLocations, locateItem } from '../itemLocations';

import type { File } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';

// The contracts still type both relations as bare ids while the admin populates
// them, so the fixtures mirror the wire shape and cast at the boundary.
const asset = (id: number, folder: unknown): File =>
  ({ id, name: `a-${id}.png`, hash: `h-${id}`, folder }) as unknown as File;

const folder = (id: number, parent: unknown): Folder =>
  ({ id, name: `folder-${id}`, parent }) as unknown as Folder;

describe('buildItemLocations', () => {
  it('reads the populated folder off an asset row', () => {
    const locations = buildItemLocations([asset(10, { id: 4 })], []);

    expect(locations.fileFolderId(10)).toBe(4);
  });

  it('reads the populated parent off a folder row', () => {
    const locations = buildItemLocations([], [folder(3, { id: 4, name: 'A' })]);

    expect(locations.folderParentId(3)).toBe(4);
  });

  it('distinguishes a root-level row (null) from an unknown id (undefined)', () => {
    const locations = buildItemLocations([asset(10, null)], [folder(3, null)]);

    expect(locations.fileFolderId(10)).toBe(null);
    expect(locations.folderParentId(3)).toBe(null);
    expect(locations.fileFolderId(99)).toBeUndefined();
    expect(locations.folderParentId(99)).toBeUndefined();
  });

  it('keeps files and folders in separate namespaces', () => {
    const locations = buildItemLocations([asset(1, { id: 4 })], [folder(1, { id: 8, name: 'B' })]);

    expect(locations.fileFolderId(1)).toBe(4);
    expect(locations.folderParentId(1)).toBe(8);
  });
});

describe('locateItem', () => {
  const locations = buildItemLocations([asset(10, null)], [folder(3, { id: 4, name: 'A' })]);

  it('returns the loaded location, ignoring the fallback', () => {
    expect(locateItem(locations, 'folder', 3, null)).toBe(4);
  });

  it('returns null for a loaded root-level row rather than falling back', () => {
    expect(locateItem(locations, 'file', 10, 9)).toBe(null);
  });

  it('falls back only when the id is not loaded', () => {
    expect(locateItem(locations, 'file', 99, 9)).toBe(9);
    expect(locateItem(emptyItemLocations, 'folder', 3, 9)).toBe(9);
  });
});
