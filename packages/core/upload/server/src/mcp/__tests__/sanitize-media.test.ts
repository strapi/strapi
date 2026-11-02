import {
  sanitizeMediaAsset,
  sanitizeMediaFolderTree,
  sanitizeMediaFolder,
} from '../sanitizers/sanitize-media';

describe('sanitizeMediaAsset', () => {
  const rawFile = {
    id: 7,
    name: 'photo.png',
    alternativeText: 'a photo',
    caption: null,
    width: 800,
    height: 600,
    formats: { thumbnail: { url: '/uploads/thumb.png' } },
    hash: 'photo_abc123',
    ext: '.png',
    mime: 'image/png',
    size: 12.5,
    url: '/uploads/photo.png',
    previewUrl: null,
    provider: 'aws-s3',
    provider_metadata: { secretAccessKey: 'super-secret', bucket: 'private-bucket' },
    folderPath: '/1/2',
    folder: { id: 2, name: 'Photos', path: '/1/2', pathId: 2 },
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
  };

  test('exposes exactly the allowlisted keys', () => {
    expect(Object.keys(sanitizeMediaAsset(rawFile)).sort()).toEqual([
      'alternativeText',
      'caption',
      'createdAt',
      'ext',
      'folder',
      'height',
      'id',
      'mime',
      'name',
      'size',
      'updatedAt',
      'url',
      'width',
    ]);
  });

  test('drops provider fields that can carry credentials', () => {
    const sanitized = sanitizeMediaAsset(rawFile);

    expect(sanitized).not.toHaveProperty('provider');
    expect(sanitized).not.toHaveProperty('provider_metadata');
    expect(JSON.stringify(sanitized)).not.toContain('super-secret');
  });

  test('drops private and internal bookkeeping fields', () => {
    const sanitized = sanitizeMediaAsset(rawFile);

    expect(sanitized).not.toHaveProperty('folderPath');
    expect(sanitized).not.toHaveProperty('hash');
    expect(sanitized).not.toHaveProperty('formats');
    expect(sanitized).not.toHaveProperty('previewUrl');
  });

  test('reduces the folder relation to id and name', () => {
    expect(sanitizeMediaAsset(rawFile).folder).toEqual({ id: 2, name: 'Photos' });
  });

  test('returns a null folder for a root-level asset', () => {
    expect(sanitizeMediaAsset({ ...rawFile, folder: null }).folder).toBeNull();
    expect(sanitizeMediaAsset({ ...rawFile, folder: undefined }).folder).toBeNull();
  });

  test('keeps a field added to the file content-type invisible until allowlisted', () => {
    // The point of the allowlist: a new column must not leak by default.
    const sanitized = sanitizeMediaAsset({ ...rawFile, newSensitiveField: 'leaked' });

    expect(sanitized).not.toHaveProperty('newSensitiveField');
  });

  test('serializes Date timestamps to ISO strings', () => {
    const sanitized = sanitizeMediaAsset({
      ...rawFile,
      createdAt: new Date('2026-09-02T08:00:00.000Z'),
    });

    expect(sanitized.createdAt).toBe('2026-09-02T08:00:00.000Z');
  });

  test('normalizes missing image dimensions to null', () => {
    const sanitized = sanitizeMediaAsset({ ...rawFile, width: null, height: undefined });

    expect(sanitized.width).toBeNull();
    expect(sanitized.height).toBeNull();
  });
});

describe('sanitizeMediaFolderTree', () => {
  test('keeps id, name and children while dropping path bookkeeping', () => {
    const structure = [
      {
        id: 1,
        name: 'root',
        path: '/1',
        pathId: 1,
        children: [{ id: 2, name: 'nested', path: '/1/2', pathId: 2, children: [] }],
      },
    ];

    expect(sanitizeMediaFolderTree(structure)).toEqual([
      { id: 1, name: 'root', children: [{ id: 2, name: 'nested', children: [] }] },
    ]);
  });

  test('recurses to arbitrary depth', () => {
    const structure = [
      {
        id: 1,
        name: 'a',
        children: [{ id: 2, name: 'b', children: [{ id: 3, name: 'c', children: [] }] }],
      },
    ];

    const [a] = sanitizeMediaFolderTree(structure);
    expect(a.children[0].children[0]).toEqual({ id: 3, name: 'c', children: [] });
  });

  test('returns an empty array for a non-array input', () => {
    expect(sanitizeMediaFolderTree(undefined)).toEqual([]);
    expect(sanitizeMediaFolderTree(null)).toEqual([]);
  });

  test('tolerates a node with no children key', () => {
    expect(sanitizeMediaFolderTree([{ id: 1, name: 'leaf' }])).toEqual([
      { id: 1, name: 'leaf', children: [] },
    ]);
  });
});

describe('sanitizeMediaFolder', () => {
  const rawFolder = {
    id: 4,
    name: 'Campaigns',
    path: '/1/4',
    pathId: 4,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    updatedAt: '2026-02-03T04:05:06.000Z',
  };

  test('exposes only the allowlisted folder fields', () => {
    // With the relation loaded, every allowlisted key is present and nothing else is.
    expect(sanitizeMediaFolder({ ...rawFolder, parent: null })).toEqual({
      id: 4,
      name: 'Campaigns',
      parent: null,
      createdAt: '2026-01-02T03:04:05.000Z',
      updatedAt: '2026-02-03T04:05:06.000Z',
    });
  });

  test('drops the internal materialized-path bookkeeping', () => {
    const sanitized = sanitizeMediaFolder(rawFolder);

    // `path` and `pathId` drive the cascade internally and must never look addressable.
    expect(sanitized).not.toHaveProperty('path');
    expect(sanitized).not.toHaveProperty('pathId');
  });

  test('exposes a populated parent as id and name', () => {
    expect(
      sanitizeMediaFolder({ ...rawFolder, parent: { id: 1, name: 'Root', path: '/1' } })?.parent
    ).toEqual({ id: 1, name: 'Root' });
  });

  test('accepts a parent that arrives as a bare id', () => {
    // Depending on the query, the relation comes back populated or as a plain id.
    expect(sanitizeMediaFolder({ ...rawFolder, parent: 1 })?.parent).toEqual({ id: 1 });
  });

  test('reports a root-level folder as parent: null', () => {
    expect(sanitizeMediaFolder({ ...rawFolder, parent: null })?.parent).toBeNull();
  });

  test('omits parent entirely when the relation was not loaded', () => {
    // `parent: null` is a claim that the folder sits at the root. A row selected without the
    // relation cannot support it: `rawFolder` has path /1/4, so it demonstrably HAS a parent.
    // Reporting null here would tell an agent a nested folder is root-level — which matters
    // most in a destructive delete preview.
    const sanitized = sanitizeMediaFolder(rawFolder);

    expect(sanitized).not.toHaveProperty('parent');
    expect(sanitized?.parent).toBeUndefined();
  });

  test('distinguishes an unloaded parent from an explicit root', () => {
    const unloaded = sanitizeMediaFolder({ id: 2, name: 'Child', path: '/1/2' });
    const atRoot = sanitizeMediaFolder({ id: 2, name: 'Child', path: '/2', parent: null });

    expect('parent' in unloaded!).toBe(false);
    expect(atRoot?.parent).toBeNull();
  });

  test('returns null for a missing row rather than throwing', () => {
    // A write whose read-back finds nothing must not fail on a property access.
    expect(sanitizeMediaFolder(null)).toBeNull();
    expect(sanitizeMediaFolder(undefined)).toBeNull();
  });
});
