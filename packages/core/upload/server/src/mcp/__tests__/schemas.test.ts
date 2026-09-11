import {
  mediaListAssetsInputSchema,
  mediaGetAssetInputSchema,
  mediaListAssetsOutputSchema,
  mediaGetAssetOutputSchema,
  mediaListFoldersOutputSchema,
  mediaUpdateAssetInputSchema,
  mediaUpdateAssetOutputSchema,
  mediaCreateFolderInputSchema,
  mediaRenameFolderInputSchema,
  mediaMoveFolderInputSchema,
  mediaDeleteFolderInputSchema,
} from '../schemas';
import { ALLOWED_SORT_STRINGS } from '../../constants';

describe('upload MCP schemas', () => {
  describe('media_list_assets input', () => {
    test('accepts an empty object — every filter is optional', () => {
      expect(mediaListAssetsInputSchema.safeParse({}).success).toBe(true);
    });

    test('accepts the documented filters', () => {
      const parsed = mediaListAssetsInputSchema.safeParse({
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
      expect(mediaListAssetsInputSchema.safeParse({ folderId: null }).success).toBe(true);
    });

    test.each(ALLOWED_SORT_STRINGS)('accepts the allowed sort string %s', (sort) => {
      expect(mediaListAssetsInputSchema.safeParse({ sort }).success).toBe(true);
    });

    test('rejects a sort on a private column', () => {
      // folderPath is `private: true` on the file content-type and must not be sortable.
      expect(mediaListAssetsInputSchema.safeParse({ sort: 'folderPath:ASC' }).success).toBe(false);
    });

    test('rejects a non-integer or out-of-range page size', () => {
      expect(mediaListAssetsInputSchema.safeParse({ pageSize: 0 }).success).toBe(false);
      expect(mediaListAssetsInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
      expect(mediaListAssetsInputSchema.safeParse({ pageSize: 1.5 }).success).toBe(false);
    });

    test('rejects a zero or negative page', () => {
      expect(mediaListAssetsInputSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(mediaListAssetsInputSchema.safeParse({ page: -1 }).success).toBe(false);
    });
  });

  describe('media_get_asset input', () => {
    test('requires a positive integer id', () => {
      expect(mediaGetAssetInputSchema.safeParse({ id: 42 }).success).toBe(true);
      expect(mediaGetAssetInputSchema.safeParse({ id: 0 }).success).toBe(false);
      expect(mediaGetAssetInputSchema.safeParse({ id: 1.5 }).success).toBe(false);
    });

    test('rejects a documentId in place of a numeric id', () => {
      // Media files are not documents; a string identifier is a caller error worth surfacing.
      expect(mediaGetAssetInputSchema.safeParse({ id: 'z7v8zma53x01r6oceimv922b' }).success).toBe(
        false
      );
    });

    test('requires the id', () => {
      expect(mediaGetAssetInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('media_update_asset input', () => {
    test('accepts the three writable metadata fields', () => {
      const parsed = mediaUpdateAssetInputSchema.safeParse({
        id: 1,
        name: 'renamed.jpg',
        alternativeText: 'alt',
        caption: 'caption',
      });

      expect(parsed.success).toBe(true);
    });

    test('accepts a partial patch', () => {
      expect(mediaUpdateAssetInputSchema.safeParse({ id: 1, caption: 'only this' }).success).toBe(
        true
      );
    });

    test('accepts null on the nullable text fields, to clear them', () => {
      expect(
        mediaUpdateAssetInputSchema.safeParse({ id: 1, alternativeText: null, caption: null })
          .success
      ).toBe(true);
    });

    test('rejects a null name — an asset cannot be left unnamed', () => {
      expect(mediaUpdateAssetInputSchema.safeParse({ id: 1, name: null }).success).toBe(false);
      expect(mediaUpdateAssetInputSchema.safeParse({ id: 1, name: '' }).success).toBe(false);
    });

    test('requires the numeric id', () => {
      expect(mediaUpdateAssetInputSchema.safeParse({ name: 'renamed.jpg' }).success).toBe(false);
      expect(
        mediaUpdateAssetInputSchema.safeParse({ id: 'z7v8zma53x01r6oceimv922b', name: 'x' }).success
      ).toBe(false);
    });

    test.each([
      ['folder', 3],
      ['folderId', 3],
      ['folderPath', '/1/2'],
    ])('rejects %s and directs the caller to media_move_assets', (field, value) => {
      const parsed = mediaUpdateAssetInputSchema.safeParse({ id: 1, [field]: value });

      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error?.issues)).toMatch(/media_move_assets/);
    });

    test.each([
      ['url', '/uploads/evil.jpg'],
      ['provider', 'aws-s3'],
      ['provider_metadata', { secretKey: 'leak' }],
      ['hash', 'forced_hash'],
      ['mime', 'text/html'],
      ['size', 1],
      ['width', 10],
      ['height', 10],
      ['ext', '.png'],
      ['formats', { thumbnail: {} }],
    ])('rejects the provider-owned field %s', (field, value) => {
      expect(
        mediaUpdateAssetInputSchema.safeParse({ id: 1, name: 'renamed.jpg', [field]: value })
          .success
      ).toBe(false);
    });

    test.each(['file', 'files', 'data', 'buffer', 'filepath', 'focalPoint'])(
      'rejects the out-of-scope field %s',
      (field) => {
        // File content is out of MCP scope entirely — MCP is text-only.
        expect(
          mediaUpdateAssetInputSchema.safeParse({ id: 1, name: 'renamed.jpg', [field]: 'x' })
            .success
        ).toBe(false);
      }
    );

    test('reports the unrecognised key by name, so an agent can correct itself', () => {
      const parsed = mediaUpdateAssetInputSchema.safeParse({ id: 1, name: 'x', folder: 3 });

      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error?.issues)).toMatch(/folder/);
    });
  });

  describe('media_update_asset output', () => {
    test('returns the asset in the same shape as the read tools', () => {
      const parsed = mediaUpdateAssetOutputSchema.safeParse({
        data: {
          id: 1,
          name: 'renamed.jpg',
          alternativeText: 'alt',
          caption: null,
          url: '/uploads/photo.jpg',
          mime: 'image/jpeg',
          size: 12.5,
          folder: null,
        },
      });

      expect(parsed.success).toBe(true);
    });

    test('requires data — a successful write always returns the updated asset', () => {
      expect(mediaUpdateAssetOutputSchema.safeParse({ data: null }).success).toBe(false);
      expect(mediaUpdateAssetOutputSchema.safeParse({}).success).toBe(false);
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
      expect(mediaGetAssetOutputSchema.safeParse({ data: asset }).success).toBe(true);
    });

    test('accepts a null folder for a root-level asset', () => {
      expect(
        mediaGetAssetOutputSchema.safeParse({ data: { ...asset, folder: null } }).success
      ).toBe(true);
    });

    test('accepts a null data payload', () => {
      expect(mediaGetAssetOutputSchema.safeParse({ data: null }).success).toBe(true);
    });

    test('strips fields outside the allowlist', () => {
      const parsed = mediaGetAssetOutputSchema.parse({
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
      const parsed = mediaListAssetsOutputSchema.safeParse({
        results: [asset],
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      });

      expect(parsed.success).toBe(true);
    });

    test('validates an arbitrarily nested folder tree', () => {
      const parsed = mediaListFoldersOutputSchema.safeParse({
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
        mediaListFoldersOutputSchema.safeParse({ data: [{ id: 1, name: 'root' }] }).success
      ).toBe(false);
    });
  });
  // ---------------------------------------------------------------------------
  // folder write inputs
  // ---------------------------------------------------------------------------

  describe('media_create_folder input', () => {
    test('accepts a name alone — the folder lands at the root', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos' }).success).toBe(true);
    });

    test('accepts an explicit parent, and null for the root', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos', parent: 3 }).success).toBe(
        true
      );
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos', parent: null }).success).toBe(
        true
      );
    });

    test('requires the name', () => {
      expect(mediaCreateFolderInputSchema.safeParse({}).success).toBe(false);
      expect(mediaCreateFolderInputSchema.safeParse({ name: '' }).success).toBe(false);
    });

    test('rejects a name with a slash, which would corrupt the materialized path', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'a/b' }).success).toBe(false);
    });

    test('rejects a name padded with whitespace', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: ' Photos' }).success).toBe(false);
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos ' }).success).toBe(false);
    });

    test('rejects an unknown key rather than silently ignoring it', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos', path: '/1' }).success).toBe(
        false
      );
    });

    test('rejects a non-integer or zero parent id', () => {
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos', parent: 0 }).success).toBe(
        false
      );
      expect(mediaCreateFolderInputSchema.safeParse({ name: 'Photos', parent: 1.5 }).success).toBe(
        false
      );
    });
  });

  describe('media_rename_folder input', () => {
    test('accepts an id and a name', () => {
      expect(mediaRenameFolderInputSchema.safeParse({ id: 1, name: 'Renamed' }).success).toBe(true);
    });

    test('requires both the id and the name', () => {
      expect(mediaRenameFolderInputSchema.safeParse({ id: 1 }).success).toBe(false);
      expect(mediaRenameFolderInputSchema.safeParse({ name: 'Renamed' }).success).toBe(false);
    });

    test('rejects a parent, pointing the caller at media_move_folder', () => {
      // Rename and move are separate tools, so a parent here is a mis-selected tool.
      const parsed = mediaRenameFolderInputSchema.safeParse({ id: 1, name: 'Renamed', parent: 2 });

      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toMatch(/media_move_folder/);
    });

    test('applies the same name rules as media_create_folder', () => {
      expect(mediaRenameFolderInputSchema.safeParse({ id: 1, name: 'a/b' }).success).toBe(false);
      expect(mediaRenameFolderInputSchema.safeParse({ id: 1, name: ' padded' }).success).toBe(
        false
      );
    });

    test('rejects a documentId in place of a numeric id', () => {
      expect(
        mediaRenameFolderInputSchema.safeParse({ id: 'z7v8zma53x01r6oceimv922b', name: 'x' })
          .success
      ).toBe(false);
    });
  });

  describe('media_move_folder input', () => {
    test('accepts an id with a destination parent', () => {
      expect(mediaMoveFolderInputSchema.safeParse({ id: 1, parent: 2 }).success).toBe(true);
    });

    test('accepts parent: null to move a folder to the root', () => {
      expect(mediaMoveFolderInputSchema.safeParse({ id: 1, parent: null }).success).toBe(true);
    });

    test('requires the parent, so a mistyped move cannot become a silent no-op', () => {
      expect(mediaMoveFolderInputSchema.safeParse({ id: 1 }).success).toBe(false);
    });

    test('rejects a name, pointing the caller at media_rename_folder', () => {
      const parsed = mediaMoveFolderInputSchema.safeParse({ id: 1, parent: 2, name: 'Renamed' });

      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toMatch(/media_rename_folder/);
    });
  });

  describe('media_delete_folder input', () => {
    test('accepts a list of ids, with no dryRun flag', () => {
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [1, 2] }).success).toBe(true);
    });

    test('does not default dryRun at the schema level — the handler owns the safe default', () => {
      // A schema default would be published as `false`-able JSON Schema; keeping the default in
      // the handler means an omitted flag is a preview no matter how the client serialises it.
      const parsed = mediaDeleteFolderInputSchema.safeParse({ ids: [1] });

      expect(parsed.success).toBe(true);
      expect((parsed as { data: Record<string, unknown> }).data.dryRun).toBeUndefined();
    });

    test('accepts an explicit dryRun on both branches', () => {
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [1], dryRun: true }).success).toBe(true);
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [1], dryRun: false }).success).toBe(
        true
      );
    });

    test('requires at least one id', () => {
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [] }).success).toBe(false);
      expect(mediaDeleteFolderInputSchema.safeParse({}).success).toBe(false);
    });

    test('caps the batch size', () => {
      const ids = Array.from({ length: 101 }, (_, index) => index + 1);
      expect(mediaDeleteFolderInputSchema.safeParse({ ids }).success).toBe(false);
    });

    test('rejects non-integer and non-positive ids', () => {
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [0] }).success).toBe(false);
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [1.5] }).success).toBe(false);
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: ['1'] }).success).toBe(false);
    });

    test('rejects an unknown key', () => {
      expect(mediaDeleteFolderInputSchema.safeParse({ ids: [1], force: true }).success).toBe(false);
    });
  });
});
