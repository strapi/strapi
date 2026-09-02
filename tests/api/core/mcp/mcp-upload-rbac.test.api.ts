import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import { createMcpClient, type AdminPermission, type AdminToken } from './utils/mcp-client';
import { createMediaSeeder } from './utils/media-seed';

const UPLOAD_ACTIONS = {
  read: 'plugin::upload.read',
  settingsRead: 'plugin::upload.settings.read',
  assetsUpdate: 'plugin::upload.assets.update',
} as const;

const READ_TOOLS = ['list_media', 'get_media', 'list_folders'] as const;

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

describe('MCP upload tools RBAC (api)', () => {
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

  /** A session that can both write metadata and read it back for verification. */
  const createUpdateTokenSession = async (): Promise<AdminToken> => {
    const token = await createAdminToken([
      permission(UPLOAD_ACTIONS.read),
      permission(UPLOAD_ACTIONS.assetsUpdate),
    ]);
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

      expect(toolNames.filter((name) => /media|folders/.test(name)).sort()).toEqual(
        [...READ_TOOLS].sort()
      );
      expect(toolNames).not.toContain('update_media');
    });

    test('a token with plugin::upload.assets.update sees the metadata tool', async () => {
      const token = await createUpdateTokenSession();

      expect(await mcp.listToolNames(token.accessKey)).toContain('update_media');
    });
  });

  // ---------------------------------------------------------------------------
  // list_media
  // ---------------------------------------------------------------------------

  describe('list_media', () => {
    test('returns the sanitized asset shape with no provider secrets or private metadata', async () => {
      await seeder.seedAsset({ name: 'listed.jpg', alternativeText: 'alt text' });
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'list_media', {});

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

      const inFolder = await mcp.callTool(token.accessKey, 'list_media', {
        folderId: folder.id,
      });
      expect(
        (inFolder.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['in-folder.jpg']);

      const atRoot = await mcp.callTool(token.accessKey, 'list_media', {
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

      const images = await mcp.callTool(token.accessKey, 'list_media', { mime: 'image' });
      expect(
        (images.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['photo.jpg']);

      const pdfs = await mcp.callTool(token.accessKey, 'list_media', {
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

      const response = await mcp.callTool(token.accessKey, 'list_media', { name: 'logo' });

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

      const response = await mcp.callTool(token.accessKey, 'list_media', {
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

      const response = await mcp.callTool(token.accessKey, 'list_media', {
        sort: 'folderPath:ASC',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // get_media
  // ---------------------------------------------------------------------------

  describe('get_media', () => {
    test('returns one sanitized asset by numeric id, including its folder', async () => {
      const folder = await seeder.seedFolder('Docs');
      const seeded = await seeder.seedAsset({
        name: 'single.jpg',
        folderId: folder.id,
        caption: 'a caption',
      });

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'get_media', { id: seeded.id });

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

      const response = await mcp.callTool(token.accessKey, 'get_media', { id: 999999 });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });

    test('rejects a documentId in place of a numeric id', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'get_media', {
        id: 'z7v8zma53x01r6oceimv922b',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // list_folders
  // ---------------------------------------------------------------------------

  describe('list_folders', () => {
    test('returns the nested folder tree without internal path bookkeeping', async () => {
      const parent = await seeder.seedFolder('Parent');
      await seeder.seedFolder('Child', parent.id);

      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'list_folders', {});

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

      const response = await mcp.callTool(token.accessKey, 'list_folders', {});

      expect(response.result?.structuredContent?.data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // update_media
  // ---------------------------------------------------------------------------

  describe('update_media', () => {
    const structured = (response: Awaited<ReturnType<typeof mcp.callTool>>) =>
      response.result?.structuredContent?.data as Record<string, unknown>;

    const readBack = async (accessKey: string, id: number) => {
      const response = await mcp.callTool(accessKey, 'get_media', { id });
      expect(response.error).toBeUndefined();
      return response.result?.structuredContent?.data as Record<string, unknown>;
    };

    test('round-trips a metadata update, confirmed by get_media', async () => {
      const seeded = await seeder.seedAsset({ name: 'before.jpg', alternativeText: 'old alt' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        name: 'after.jpg',
        alternativeText: 'new alt',
        caption: 'new caption',
      });

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      // The write response is authoritative on its own — no follow-up read required.
      expect(structured(response)).toMatchObject({
        id: seeded.id,
        name: 'after.jpg',
        alternativeText: 'new alt',
        caption: 'new caption',
      });

      // ...and the change is actually persisted, not just echoed back.
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        name: 'after.jpg',
        alternativeText: 'new alt',
        caption: 'new caption',
      });
    });

    test('leaves the fields the caller omitted untouched', async () => {
      const seeded = await seeder.seedAsset({
        name: 'keep.jpg',
        alternativeText: 'keep alt',
        caption: 'keep caption',
      });
      const token = await createUpdateTokenSession();

      await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        caption: 'only the caption changed',
      });

      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        name: 'keep.jpg',
        alternativeText: 'keep alt',
        caption: 'only the caption changed',
      });
    });

    test('clears a text field passed as null', async () => {
      const seeded = await seeder.seedAsset({
        name: 'clear.jpg',
        alternativeText: 'to be cleared',
      });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        alternativeText: null,
      });

      expect(response.error ?? response.result?.isError).toBeFalsy();
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({ alternativeText: '' });
    });

    test('does not move the asset or change its url when renaming', async () => {
      const folder = await seeder.seedFolder('Stays');
      const seeded = await seeder.seedAsset({ name: 'renamed.jpg', folderId: folder.id });
      const token = await createUpdateTokenSession();

      const before = await readBack(token.accessKey, seeded.id);

      await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        name: 'new-label.jpg',
      });

      const after = await readBack(token.accessKey, seeded.id);
      expect(after).toMatchObject({
        name: 'new-label.jpg',
        url: before.url,
        mime: before.mime,
        folder: { id: folder.id, name: 'Stays' },
      });
    });

    test('returns the sanitized shape, with no provider secrets on the write path either', async () => {
      const seeded = await seeder.seedAsset({ name: 'sanitized.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        caption: 'a caption',
      });

      const asset = structured(response);
      for (const field of FORBIDDEN_ASSET_FIELDS) {
        expect(asset).not.toHaveProperty(field);
      }
    });

    test.each([
      ['url', '/uploads/evil.jpg'],
      ['folder', 1],
      ['folderId', 1],
      ['folderPath', '/1/2'],
      ['provider', 'aws-s3'],
      ['provider_metadata', { secretKey: 'leak' }],
      ['hash', 'forced_hash'],
      ['mime', 'text/html'],
      ['size', 1],
      ['formats', { thumbnail: {} }],
      ['file', 'new binary content'],
      ['files', ['new binary content']],
      ['focalPoint', { x: 10, y: 10 }],
    ])('rejects the out-of-scope field %s at the schema level', async (field, value) => {
      const seeded = await seeder.seedAsset({ name: 'guarded.jpg', alternativeText: 'untouched' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        name: 'attempted.jpg',
        [field]: value,
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();

      // A rejected call must not partially apply: the legitimate `name` in the same payload
      // is discarded along with the unrecognised key.
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        name: 'guarded.jpg',
        alternativeText: 'untouched',
      });
    });

    test('rejects a patch with no writable field, naming the tool that does move assets', async () => {
      const seeded = await seeder.seedAsset({ name: 'nothing.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
      expect(JSON.stringify(response)).toMatch(/move_media/);
    });

    test('rejects a documentId in place of a numeric id', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: 'z7v8zma53x01r6oceimv922b',
        name: 'x.jpg',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });

    test('errors for an unknown id', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: 999999,
        name: 'ghost.jpg',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });

    test('denies the write to a token without plugin::upload.assets.update', async () => {
      const seeded = await seeder.seedAsset({ name: 'readonly.jpg', alternativeText: 'untouched' });

      // A read-granted token: it can see the asset but must not be able to edit it.
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        name: 'hijacked.jpg',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        name: 'readonly.jpg',
        alternativeText: 'untouched',
      });
    });

    test('denies the write to a token holding an unrelated upload permission', async () => {
      const seeded = await seeder.seedAsset({ name: 'unrelated.jpg' });

      const token = await createAdminToken([permission(UPLOAD_ACTIONS.settingsRead)]);
      await mcp.initializeSession(token.accessKey);

      expect(await mcp.listToolNames(token.accessKey)).not.toContain('update_media');

      const response = await mcp.callTool(token.accessKey, 'update_media', {
        id: seeded.id,
        name: 'hijacked.jpg',
      });

      expect(response.error ?? response.result?.isError).toBeTruthy();
    });
  });
});
