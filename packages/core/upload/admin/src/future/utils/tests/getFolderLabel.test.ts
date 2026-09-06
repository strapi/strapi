import { getFolderLabel } from '../getFolderLabel';

import type { FolderNode } from '../../../../../shared/contracts/folders';

const ROOT_LABEL = 'Media Library';

const folderStructure: FolderNode[] = [
  {
    id: 1,
    name: 'About',
    children: [{ id: 2, name: 'Images', children: [] }],
  },
  {
    id: 3,
    name: 'Tech',
    children: [
      {
        id: 4,
        name: 'Images',
        children: [{ id: 5, name: 'Logos', children: [] }],
      },
    ],
  },
];

describe('getFolderLabel', () => {
  it('returns the root label for the null (Media Library root) id', () => {
    expect(getFolderLabel(folderStructure, null, ROOT_LABEL)).toBe(ROOT_LABEL);
  });

  it('returns the leaf name for a top-level folder', () => {
    expect(getFolderLabel(folderStructure, 1, ROOT_LABEL)).toBe('About');
  });

  it('returns the leaf name (not the ancestry) for a deeply nested folder', () => {
    expect(getFolderLabel(folderStructure, 5, ROOT_LABEL)).toBe('Logos');
  });

  it('falls back to the root label for an unknown id', () => {
    expect(getFolderLabel(folderStructure, 999, ROOT_LABEL)).toBe(ROOT_LABEL);
  });
});
