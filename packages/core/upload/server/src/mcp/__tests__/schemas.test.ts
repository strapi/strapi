import {
  listMediaAssetsInputSchema,
  getMediaAssetInputSchema,
  listMediaAssetsOutputSchema,
  getMediaAssetOutputSchema,
  listMediaFoldersOutputSchema,
} from '../schemas';
import { ALLOWED_SORT_STRINGS } from '../../constants';

describe('upload MCP schemas', () => {
  describe('list_media_assets input', () => {
    test('accepts an empty object — every filter is optional', () => {
      expect(listMediaAssetsInputSchema.safeParse({}).success).toBe(true);
    });

    test('accepts the documented filters', () => {
      const parsed = listMediaAssetsInputSchema.safeParse({
        folderId: 3,
        mime: 'image/png',
        name: 'logo',
        page: 2,
        pageSize: 50,
        sort: 'name:ASC',
      });

      expect(parsed.success).toBe(true);
    });

    test('accepts folderId: null to mean the media library root', () => {
      expect(listMediaAssetsInputSchema.safeParse({ folderId: null }).success).toBe(true);
    });

    test.each(ALLOWED_SORT_STRINGS)('accepts the allowed sort string %s', (sort) => {
      expect(listMediaAssetsInputSchema.safeParse({ sort }).success).toBe(true);
    });

    test('rejects a sort on a private column', () => {
      // folderPath is `private: true` on the file content-type and must not be sortable.
      expect(listMediaAssetsInputSchema.safeParse({ sort: 'folderPath:ASC' }).success).toBe(false);
    });

    test('rejects a non-integer or out-of-range page size', () => {
      expect(listMediaAssetsInputSchema.safeParse({ pageSize: 0 }).success).toBe(false);
      expect(listMediaAssetsInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
      expect(listMediaAssetsInputSchema.safeParse({ pageSize: 1.5 }).success).toBe(false);
    });

    test('rejects a zero or negative page', () => {
      expect(listMediaAssetsInputSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(listMediaAssetsInputSchema.safeParse({ page: -1 }).success).toBe(false);
    });
  });

  describe('get_media_asset input', () => {
    test('requires a positive integer id', () => {
      expect(getMediaAssetInputSchema.safeParse({ id: 42 }).success).toBe(true);
      expect(getMediaAssetInputSchema.safeParse({ id: 0 }).success).toBe(false);
      expect(getMediaAssetInputSchema.safeParse({ id: 1.5 }).success).toBe(false);
    });

    test('rejects a documentId in place of a numeric id', () => {
      // Media files are not documents; a string identifier is a caller error worth surfacing.
      expect(getMediaAssetInputSchema.safeParse({ id: 'z7v8zma53x01r6oceimv922b' }).success).toBe(
        false
      );
    });

    test('requires the id', () => {
      expect(getMediaAssetInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('output schemas', () => {
    const asset = {
      id: 1,
      name: 'photo.png',
      alternativeText: 'a photo',
      caption: null,
      url: '/uploads/photo.png',
      mime: 'image/png',
      size: 12.5,
      width: 800,
      height: 600,
      ext: '.png',
      folder: { id: 2, name: 'Photos' },
      createdAt: '2026-09-02T08:00:00.000Z',
      updatedAt: '2026-09-02T08:00:00.000Z',
    };

    test('validates a sanitized asset', () => {
      expect(getMediaAssetOutputSchema.safeParse({ data: asset }).success).toBe(true);
    });

    test('accepts a null folder for a root-level asset', () => {
      expect(
        getMediaAssetOutputSchema.safeParse({ data: { ...asset, folder: null } }).success
      ).toBe(true);
    });

    test('accepts a null data payload', () => {
      expect(getMediaAssetOutputSchema.safeParse({ data: null }).success).toBe(true);
    });

    test('strips fields outside the allowlist', () => {
      const parsed = getMediaAssetOutputSchema.parse({
        data: {
          ...asset,
          provider: 'aws-s3',
          provider_metadata: { secretKey: 'super-secret' },
          hash: 'photo_abc123',
          folderPath: '/1/2',
          formats: { thumbnail: {} },
        },
      });

      expect(parsed.data).not.toHaveProperty('provider');
      expect(parsed.data).not.toHaveProperty('provider_metadata');
      expect(parsed.data).not.toHaveProperty('hash');
      expect(parsed.data).not.toHaveProperty('folderPath');
      expect(parsed.data).not.toHaveProperty('formats');
    });

    test('validates a paginated list payload', () => {
      const parsed = listMediaAssetsOutputSchema.safeParse({
        results: [asset],
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      });

      expect(parsed.success).toBe(true);
    });

    test('validates an arbitrarily nested folder tree', () => {
      const parsed = listMediaFoldersOutputSchema.safeParse({
        data: [
          {
            id: 1,
            name: 'root',
            children: [
              { id: 2, name: 'nested', children: [{ id: 3, name: 'deep', children: [] }] },
            ],
          },
        ],
      });

      expect(parsed.success).toBe(true);
    });

    test('rejects a folder node missing children', () => {
      expect(
        listMediaFoldersOutputSchema.safeParse({ data: [{ id: 1, name: 'root' }] }).success
      ).toBe(false);
    });
  });
});
