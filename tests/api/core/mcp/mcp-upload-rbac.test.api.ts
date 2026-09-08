import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import { createMcpClient, type AdminPermission, type AdminToken } from './utils/mcp-client';
import { createMediaSeeder } from './utils/media-seed';

const UPLOAD_ACTIONS = {
  read: 'plugin::upload.read',
  settingsRead: 'plugin::upload.settings.read',
} as const;

const READ_TOOLS = ['media_list_assets', 'media_get_asset', 'media_list_folders'] as const;

/** Fields that must never reach an MCP client. */
const FORBIDDEN_ASSET_FIELDS = [
  'provider',
  'provider_metadata',
  'hash',
  'folderPath',
  'formats',
  'previewUrl',
  'related',
] as const;

describe('MCP upload read tools RBAC (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let mcp: ReturnType<typeof createMcpClient>;
  let seeder: ReturnType<typeof createMediaSeeder>;
  let tokenCount = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    mcp = createMcpClient(strapi, 'strapi-mcp-upload-test');
    seeder = createMediaSeeder(strapi);

    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await seeder.cleanup();
    await deleteAllAdminTokens();
    await strapi.destroy();
  });

  afterEach(async () => {
    await seeder.cleanup();
    await deleteAllAdminTokens();
  });

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-upload-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  /**
   * Media Library actions are registered in the `plugins` section without a subject, so an
   * admin-token permission for them carries a null subject — passing a model UID here is
   * rejected by the token validation as a subject the action does not apply to.
   */
  const permission = (action: string): AdminPermission => ({
    action,
    subject: null,
    conditions: [],
    properties: {},
  });

  const readPermissions = (): AdminPermission[] => [permission(UPLOAD_ACTIONS.read)];

  const createReadTokenSession = async (): Promise<AdminToken> => {
    const token = await createAdminToken(readPermissions());
    await mcp.initializeSession(token.accessKey);
    return token;
  };

  // ---------------------------------------------------------------------------
  // Tool exposure
  // ---------------------------------------------------------------------------

  describe('tool exposure', () => {
    test('a token with plugin::upload.read sees all three read tools', async () => {
      const token = await createReadTokenSession();

      const toolNames = await mcp.listToolNames(token.accessKey);

      for (const tool of READ_TOOLS) {
        expect(toolNames).toContain(tool);
      }
    });

    test('a token without plugin::upload.read neither lists nor can call the read tools', async () => {
      await seeder.seedAsset({ name: 'private.jpg' });

      // A valid admin token holding an unrelated upload permission: authenticated for the
      // plugin, but without `plugin::upload.read` it must not reach any asset.
      const token = await createAdminToken([permission(UPLOAD_ACTIONS.settingsRead)]);
      await mcp.initializeSession(token.accessKey);

      const toolNames = await mcp.listToolNames(token.accessKey);
      for (const tool of READ_TOOLS) {
        expect(toolNames).not.toContain(tool);
      }

      for (const tool of READ_TOOLS) {
        const response = await mcp.callTool(token.accessKey, tool, {});
        // Denied either as a JSON-RPC error (unknown tool) or a tool-level error.
        expect(response.error ?? response.result?.isError).toBeTruthy();
      }
    });

    test('the read-only token does not gain any upload write tool', async () => {
      const token = await createReadTokenSession();

      const toolNames = await mcp.listToolNames(token.accessKey);

      // Anchored on the media_ prefix every upload tool carries, so this stays exact as the
      // surface grows. A loose /media|folders/ would match content-manager tools too.
      expect(toolNames.filter((name) => /^media_/.test(name)).sort()).toEqual(
        [...READ_TOOLS].sort()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // media_list_assets
  // ---------------------------------------------------------------------------

  describe('media_list_assets', () => {
    test('returns the sanitized asset shape with no provider secrets or private metadata', async () => {
      await seeder.seedAsset({ name: 'listed.jpg', alternativeText: 'alt text' });
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_assets', {});

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      const results = response.result?.structuredContent?.results as Record<string, unknown>[];
      expect(results).toHaveLength(1);

      const [asset] = results;
      expect(asset).toMatchObject({
        name: 'listed.jpg',
        alternativeText: 'alt text',
        mime: 'image/jpeg',
      });
      expect(typeof asset.id).toBe('number');
      expect(asset).not.toHaveProperty('documentId');

      for (const field of FORBIDDEN_ASSET_FIELDS) {
        expect(asset).not.toHaveProperty(field);
      }

      expect(response.result?.structuredContent?.pagination).toMatchObject({
        page: 1,
        pageSize: 25,
        total: 1,
      });
    });

    test('filters by folder, and folderId: null selects root-level assets', async () => {
      const folder = await seeder.seedFolder('MCP folder');
      await seeder.seedAsset({ name: 'in-folder.jpg', folderId: folder.id });
      await seeder.seedAsset({ name: 'at-root.jpg' });

      const token = await createReadTokenSession();

      const inFolder = await mcp.callTool(token.accessKey, 'media_list_assets', {
        folderId: folder.id,
      });
      expect(
        (inFolder.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['in-folder.jpg']);

      const atRoot = await mcp.callTool(token.accessKey, 'media_list_assets', {
        folderId: null,
      });
      expect(
        (atRoot.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['at-root.jpg']);
    });

    test('filters by mime type, accepting both a bare prefix and a full type', async () => {
      await seeder.seedAsset({ fixture: 'strapi.jpg', name: 'photo.jpg' });
      await seeder.seedAsset({ fixture: 'rec.pdf', name: 'doc.pdf' });

      const token = await createReadTokenSession();

      const images = await mcp.callTool(token.accessKey, 'media_list_assets', { mime: 'image' });
      expect(
        (images.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['photo.jpg']);

      const pdfs = await mcp.callTool(token.accessKey, 'media_list_assets', {
        mime: 'application/pdf',
      });
      expect(
        (pdfs.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['doc.pdf']);
    });

    test('searches by name, case-insensitively', async () => {
      await seeder.seedAsset({ name: 'Company-Logo.jpg' });
      await seeder.seedAsset({ name: 'holiday.jpg' });

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_assets', { name: 'logo' });

      expect(
        (response.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['Company-Logo.jpg']);
    });

    test('paginates and sorts', async () => {
      await seeder.seedAsset({ name: 'a.jpg' });
      await seeder.seedAsset({ name: 'b.jpg' });

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_assets', {
        sort: 'name:ASC',
        page: 1,
        pageSize: 1,
      });

      const results = response.result?.structuredContent?.results as Record<string, unknown>[];
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('a.jpg');
      expect(response.result?.structuredContent?.pagination).toMatchObject({
        page: 1,
        pageSize: 1,
        pageCount: 2,
        total: 2,
      });
    });

    test('rejects a sort on a private column', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_assets', {
        sort: 'folderPath:ASC',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // media_get_asset
  // ---------------------------------------------------------------------------

  describe('media_get_asset', () => {
    test('returns one sanitized asset by numeric id, including its folder', async () => {
      const folder = await seeder.seedFolder('Docs');
      const seeded = await seeder.seedAsset({
        name: 'single.jpg',
        folderId: folder.id,
        caption: 'a caption',
      });

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', { id: seeded.id });

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      const asset = response.result?.structuredContent?.data as Record<string, unknown>;
      expect(asset).toMatchObject({
        id: seeded.id,
        name: 'single.jpg',
        caption: 'a caption',
        mime: 'image/jpeg',
        folder: { id: folder.id, name: 'Docs' },
      });

      for (const field of FORBIDDEN_ASSET_FIELDS) {
        expect(asset).not.toHaveProperty(field);
      }
    });

    test('errors for an unknown id', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', { id: 999999 });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });

    test('rejects a documentId in place of a numeric id', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', {
        id: 'z7v8zma53x01r6oceimv922b',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Permission conditions
  //
  // A conditioned grant has to agree across both tools: media_list_assets applies the condition
  // through the query, media_get_asset by testing the loaded row against the ability. The row
  // check needs `createdBy` (and the creator's roles) populated to match `admin::is-creator`,
  // so a get that skipped that populate would forbid exactly the assets the list returned.
  // ---------------------------------------------------------------------------

  describe('the admin::is-creator condition', () => {
    const createOwnAssetsTokenSession = async (): Promise<AdminToken> => {
      const token = await createAdminToken([
        { ...permission(UPLOAD_ACTIONS.read), conditions: ['admin::is-creator'] },
      ]);
      await mcp.initializeSession(token.accessKey);
      return token;
    };

    /** The token is minted by the super-admin request, so that user is its creator. */
    const superAdminId = async (): Promise<number> => {
      const user = await strapi.db
        .query('admin::user')
        .findOne({ where: { email: 'admin@strapi.io' } });

      expect(user).not.toBeNull();
      return user.id;
    };

    test('media_get_asset returns an asset the token owner created', async () => {
      const ownerId = await superAdminId();
      const seeded = await seeder.seedAsset({
        name: 'mine.jpg',
        createdBy: { id: ownerId },
      });

      const token = await createOwnAssetsTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', { id: seeded.id });

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);
      expect(response.result?.structuredContent?.data).toMatchObject({
        id: seeded.id,
        name: 'mine.jpg',
      });
    });

    test('media_get_asset is forbidden on an asset created by somebody else', async () => {
      const seeded = await seeder.seedAsset({ name: 'theirs.jpg' });

      const token = await createOwnAssetsTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', { id: seeded.id });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });

    test('media_list_assets and media_get_asset agree on what the condition allows', async () => {
      const ownerId = await superAdminId();
      const own = await seeder.seedAsset({ name: 'own.jpg', createdBy: { id: ownerId } });
      await seeder.seedAsset({ name: 'other.jpg' });

      const token = await createOwnAssetsTokenSession();

      const listed = await mcp.callTool(token.accessKey, 'media_list_assets', {});
      const results = listed.result?.structuredContent?.results as { id: number }[];
      expect(results.map((asset) => asset.id)).toEqual([own.id]);

      // Every id the list handed back must also be gettable, or an agent cannot act on them.
      for (const asset of results) {
        const got = await mcp.callTool(token.accessKey, 'media_get_asset', { id: asset.id });

        expect(got.error).toBeUndefined();
        expect(got.result?.isError).not.toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // media_list_folders
  // ---------------------------------------------------------------------------

  describe('media_list_folders', () => {
    test('returns the nested folder tree without internal path bookkeeping', async () => {
      const parent = await seeder.seedFolder('Parent');
      await seeder.seedFolder('Child', parent.id);

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_folders', {});

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      const tree = response.result?.structuredContent?.data as Array<Record<string, unknown>>;
      expect(tree).toHaveLength(1);
      expect(tree[0]).toMatchObject({ id: parent.id, name: 'Parent' });
      expect(tree[0]).not.toHaveProperty('path');
      expect(tree[0]).not.toHaveProperty('pathId');

      const children = tree[0].children as Array<Record<string, unknown>>;
      expect(children).toHaveLength(1);
      expect(children[0]).toMatchObject({ name: 'Child', children: [] });
      expect(children[0]).not.toHaveProperty('path');
    });

    test('returns an empty tree when there are no folders', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_list_folders', {});

      expect(response.result?.structuredContent?.data).toEqual([]);
    });
  });
});
