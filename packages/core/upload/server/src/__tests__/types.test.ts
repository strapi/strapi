import type { File } from '../types';

/**
 * The upload service (`findOne`, `findMany`, `findPage`, `findAndCountPage`, ...) returns the
 * stored `plugin::upload.file` rows. These fixtures copy the shape of those rows.
 *
 * `tsc` checks this file (`test:ts:back`): it fails when `File` rejects a real row.
 */

const imageRowWithPopulate = {
  id: 1,
  documentId: 'tjm1ihzqyc0aw4mhtfdfq0nh',
  name: 'photo.png',
  alternativeText: 'A photo',
  caption: null,
  focalPoint: { x: 10, y: 20 },
  width: 800,
  height: 600,
  formats: {
    thumbnail: {
      name: 'thumbnail_photo.png',
      hash: 'thumbnail_photo_123',
      ext: '.png',
      mime: 'image/png',
      path: null,
      width: 208,
      height: 156,
      size: 12.5,
      sizeInBytes: 12500,
      url: '/uploads/thumbnail_photo_123.png',
    },
  },
  hash: 'photo_123',
  ext: '.png',
  mime: 'image/png',
  size: 120.5,
  url: '/uploads/photo_123.png',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  isUrlSigned: false,
  folderPath: '/1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  locale: null,
  folder: {
    id: 1,
    documentId: 'f8cqc1kpd0x2hrz5ue4y8q8o',
    name: 'Photos',
    pathId: 1,
    path: '/1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
    locale: null,
  },
  related: [
    {
      id: 3,
      documentId: 'q5n4k0y1ftv6wz2bz3d0s9l1',
      __type: 'api::article.article',
      title: 'Hello',
      locale: 'en',
    },
  ],
  createdBy: { id: 1, firstname: 'Jane', lastname: 'Doe', username: null, email: 'jane@x.io' },
  updatedBy: null,
};

const documentRowWithoutPopulate = {
  id: 2,
  documentId: 'c6aqf0m2b4bq4vq7j0m9y3e2',
  name: 'notes.txt',
  alternativeText: null,
  caption: null,
  focalPoint: null,
  width: null,
  height: null,
  formats: null,
  hash: 'notes_456',
  ext: '.txt',
  mime: 'text/plain',
  size: 0.5,
  url: '/uploads/notes_456.txt',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  folderPath: '/',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  locale: null,
};

// After `replace` with a file that has no formats, the row keeps an empty `formats` object
const replacedRow = { ...documentRowWithoutPopulate, formats: {} };

describe('File type', () => {
  test('accepts an image row with populated folder, related and creator', () => {
    const file: File = imageRowWithPopulate;
    const documentId: string = file.documentId;

    expect(documentId).toBe(imageRowWithPopulate.documentId);
  });

  test('accepts a non-image row without populated relations', () => {
    const file: File = documentRowWithoutPopulate;
    const publishedAt: string | null | undefined = file.publishedAt;
    const locale: string | null | undefined = file.locale;

    expect(publishedAt).toBe(documentRowWithoutPopulate.publishedAt);
    expect(locale).toBe(null);
  });

  test('accepts a replaced row with empty formats', () => {
    const file: File = replacedRow;

    expect(file.formats).toEqual({});
  });
});
