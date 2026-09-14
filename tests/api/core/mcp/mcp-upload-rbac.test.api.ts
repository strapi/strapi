import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import {
  createMcpClient,
  expectExecutionError,
  expectInputValidationError,
  expectToolDisabled,
  expectToolOk,
  type AdminPermission,
  type AdminToken,
} from './utils/mcp-client';
import { getStrictClientUsableTools, JSON_SCHEMA_2020_12 } from './utils/strict-tool-client';
import { createMediaSeeder } from './utils/media-seed';

/**
 * The distinguishing fragment of each failure message this surface produces, so an assertion can
 * name the *kind* of failure it expects rather than just "something failed".
 *
 * These are deliberately fragments, not whole messages: the domain wording is long, agent-facing
 * prose owned by `server/src/mcp/handlers/constants.ts`, and the validation strings come from Zod
 * through the MCP SDK rather than from Strapi. Matching the identifying clause pins which error
 * was returned while leaving the prose free to be reworded. The suite runs against the built app,
 * so importing the constants themselves would mean a deep `dist` import no other api test makes.
 */
const MESSAGES = {
  // Domain failures, thrown by the handlers.
  assetNotFound: 'Media asset not found.',
  folderNotFound: 'Media folder not found.',
  forbidden: 'Forbidden access',
  noWritableField: 'Provide at least one field to update',
  folderNameTaken: 'A folder with this name already exists in the same parent folder',
  parentFolderNotFound: 'The parent folder does not exist',
  moveIntoSelf: 'A folder cannot be moved into itself',
  destinationNotFound: 'The destination folder does not exist',
  unresolvedFolderIds: 'These ids do not match any media folder',
  // Schema rejections, produced by Zod via the MCP SDK.
  invalidSort: 'sort: Invalid option',
  expectedNumber: 'Invalid input: expected number',
  expectedArray: 'Invalid input: expected array',
  emptyIdList: 'Too small: expected array to have',
  folderNameSlash: 'Folder name cannot contain slash',
  renameOnlyName: 'media_rename_folder only changes a fol',
  moveFolderOnlyParent: 'media_move_folder only changes a folder',
} as const;

const UPLOAD_ACTIONS = {
  read: 'plugin::upload.read',
  settingsRead: 'plugin::upload.settings.read',
  assetsUpdate: 'plugin::upload.assets.update',
  assetsCreate: 'plugin::upload.assets.create',
} as const;

const READ_TOOLS = ['media_list_assets', 'media_get_asset', 'media_list_folders'] as const;

const FOLDER_WRITE_TOOLS = [
  'media_create_folder',
  'media_rename_folder',
  'media_move_folder',
  'media_delete_folder',
] as const;

const WRITE_TOOLS = [
  'media_update_asset',
  'media_move_assets',
  'media_delete_assets',
  ...FOLDER_WRITE_TOOLS,
] as const;

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

  /**
   * A session that can both write and read back for verification.
   *
   * Folder writes inherit the existing asset permissions rather than folder-specific ones, but
   * not all the same one: `media_create_folder` needs `assets.create` (matching the admin's
   * `POST /upload/folders`), while rename, move and delete need `assets.update`. This token
   * holds both so it covers every write surface.
   */
  const createUpdateTokenSession = async (): Promise<AdminToken> => {
    const token = await createAdminToken([
      permission(UPLOAD_ACTIONS.read),
      permission(UPLOAD_ACTIONS.assetsUpdate),
      permission(UPLOAD_ACTIONS.assetsCreate),
    ]);
    await mcp.initializeSession(token.accessKey);
    return token;
  };

  /**
   * A session holding Update but NOT Create — the role that could once create a folder over MCP
   * while being refused the same operation in the admin panel.
   */
  const createUpdateOnlyTokenSession = async (): Promise<AdminToken> => {
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

    /**
     * The `media_*` schemas are advertised over JSON-RPC and must survive a strict
     * schema-validating client, which silently drops a tool whose schema will not compile.
     *
     * Unit tests parse the Zod schemas in-process and so cannot catch this: the risk is in the
     * emitted JSON Schema. `media_list_folders` is the tool that carries it — its folder tree is
     * recursive, which Zod emits as a `$defs` entry referring to itself — and several tools
     * advertise nullable fields (`folderId`, `folder`, `parent`).
     */
    test('a strict client retains every advertised media tool for a read token', async () => {
      const token = await createReadTokenSession();

      const advertisedTools = await mcp.listTools(token.accessKey);
      const mediaTools = advertisedTools.filter((tool) => /^media_/.test(tool.name));

      expect(mediaTools.map((tool) => tool.name).sort()).toEqual([...READ_TOOLS].sort());
      expect(getStrictClientUsableTools(mediaTools)).toHaveLength(mediaTools.length);

      for (const tool of mediaTools) {
        expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.inputSchema.$schema);
        if (tool.outputSchema !== undefined) {
          expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.outputSchema.$schema);
        }
      }

      // Pin the recursive folder tree specifically: this is the construct a strict client is
      // most likely to reject, so a passing filter above must not be a vacuous one.
      const listFolders = mediaTools.find((tool) => tool.name === 'media_list_folders');
      expect(listFolders?.outputSchema).toHaveProperty('$defs');
    });

    test('a strict client retains every advertised media tool for a read + write token', async () => {
      const token = await createUpdateTokenSession();

      const advertisedTools = await mcp.listTools(token.accessKey);
      const mediaTools = advertisedTools.filter((tool) => /^media_/.test(tool.name));

      // The full media surface, so the strict gate covers the write schemas too.
      expect(mediaTools.map((tool) => tool.name).sort()).toEqual(
        [...READ_TOOLS, ...WRITE_TOOLS].sort()
      );
      expect(getStrictClientUsableTools(mediaTools)).toHaveLength(mediaTools.length);
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
        expectToolDisabled(response, tool);
      }
    });

    test('the read-only token does not gain any upload write tool', async () => {
      const token = await createReadTokenSession();

      const toolNames = await mcp.listToolNames(token.accessKey);

      // Anchored on the media_ prefix every upload tool carries, so this stays exact as the
      // surface grows. A loose /media|folder/ would match content-manager tools too.
      expect(toolNames.filter((name) => /^media_/.test(name)).sort()).toEqual(
        [...READ_TOOLS].sort()
      );
      for (const tool of WRITE_TOOLS) {
        expect(toolNames).not.toContain(tool);
      }
    });

    test('a token with the asset write actions sees every write tool', async () => {
      const token = await createUpdateTokenSession();
      const toolNames = await mcp.listToolNames(token.accessKey);

      for (const tool of WRITE_TOOLS) {
        expect(toolNames).toContain(tool);
      }
    });

    test('a token with Update but not Create is not offered media_create_folder', async () => {
      const token = await createUpdateOnlyTokenSession();
      const toolNames = await mcp.listToolNames(token.accessKey);

      expect(toolNames).not.toContain('media_create_folder');
      // The `assets.update` writes stay available — only creation is gated differently.
      for (const tool of ['media_rename_folder', 'media_move_folder', 'media_delete_folder']) {
        expect(toolNames).toContain(tool);
      }
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

      expectInputValidationError(response, MESSAGES.invalidSort);
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

      expectExecutionError(response, 'media_get_asset', MESSAGES.assetNotFound);
    });

    test('rejects a documentId in place of a numeric id', async () => {
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_get_asset', {
        id: 'z7v8zma53x01r6oceimv922b',
      });

      expectInputValidationError(response, MESSAGES.expectedNumber);
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

      expectExecutionError(response, 'media_get_asset', MESSAGES.forbidden);
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

  // ---------------------------------------------------------------------------
  // media_update_asset
  // ---------------------------------------------------------------------------

  describe('media_update_asset', () => {
    const structured = (response: Awaited<ReturnType<typeof mcp.callTool>>) =>
      response.result?.structuredContent?.data as Record<string, unknown>;

    const readBack = async (accessKey: string, id: number) => {
      const response = await mcp.callTool(accessKey, 'media_get_asset', { id });
      expect(response.error).toBeUndefined();
      return response.result?.structuredContent?.data as Record<string, unknown>;
    };

    test('round-trips a metadata update, confirmed by media_get_asset', async () => {
      const seeded = await seeder.seedAsset({ name: 'before.jpg', alternativeText: 'old alt' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
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

      // Read the row directly, outside MCP: a symmetric bug across the read and write pair
      // would round-trip cleanly above while the stored row was wrong. This also pins the
      // `updatedBy` attribution, which the MCP-only assertions never observe.
      const row = await strapi.db.query('plugin::upload.file').findOne({
        where: { id: seeded.id },
        populate: { updatedBy: true },
      });

      expect(row).toMatchObject({
        name: 'after.jpg',
        alternativeText: 'new alt',
        caption: 'new caption',
      });
      expect(row?.updatedBy).toBeTruthy();
    });

    test('leaves the fields the caller omitted untouched', async () => {
      const seeded = await seeder.seedAsset({
        name: 'keep.jpg',
        alternativeText: 'keep alt',
        caption: 'keep caption',
      });
      const token = await createUpdateTokenSession();

      await mcp.callTool(token.accessKey, 'media_update_asset', {
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

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        alternativeText: null,
      });

      expectToolOk(response);
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({ alternativeText: '' });
    });

    test('does not move the asset or change its url when renaming', async () => {
      const folder = await seeder.seedFolder('Stays');
      const seeded = await seeder.seedAsset({ name: 'renamed.jpg', folderId: folder.id });
      const token = await createUpdateTokenSession();

      const before = await readBack(token.accessKey, seeded.id);

      await mcp.callTool(token.accessKey, 'media_update_asset', {
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

    test('reports the containing folder in its own response after a rename', async () => {
      const folder = await seeder.seedFolder('Reported');
      const seeded = await seeder.seedAsset({ name: 'in-folder.jpg', folderId: folder.id });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        alternativeText: 'still in its folder',
      });

      expect(structured(response)).toMatchObject({
        alternativeText: 'still in its folder',
        folder: { id: folder.id, name: 'Reported' },
      });

      const row: any = await strapi.db
        .query('plugin::upload.file')
        .findOne({ where: { id: seeded.id }, populate: { folder: true } });

      expect(row?.folder?.id).toBe(folder.id);
      expect(row?.folderPath).toBe(folder.path);
    });

    test('reports null only for an asset genuinely at the media library root', async () => {
      const seeded = await seeder.seedAsset({ name: 'at-root.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        caption: 'root asset',
      });

      expect(structured(response)).toMatchObject({ caption: 'root asset', folder: null });
    });

    test('returns the sanitized shape, with no provider secrets on the write path either', async () => {
      const seeded = await seeder.seedAsset({ name: 'sanitized.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
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

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        name: 'attempted.jpg',
        [field]: value,
      });

      expectInputValidationError(response);

      if (field === 'folder' || field === 'folderId' || field === 'folderPath') {
        expect(JSON.stringify(response)).toMatch(/media_move_assets/);
      }

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

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
      });

      expectExecutionError(response, 'media_update_asset', MESSAGES.noWritableField);
      expect(JSON.stringify(response)).toMatch(/media_move_assets/);
    });

    test('rejects a documentId in place of a numeric id', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: 'z7v8zma53x01r6oceimv922b',
        name: 'x.jpg',
      });

      expectInputValidationError(response, MESSAGES.expectedNumber);
    });

    test('errors for an unknown id', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: 999999,
        name: 'ghost.jpg',
      });

      expectExecutionError(response, 'media_update_asset', MESSAGES.assetNotFound);
    });

    test('denies the write to a token without plugin::upload.assets.update', async () => {
      const seeded = await seeder.seedAsset({ name: 'readonly.jpg', alternativeText: 'untouched' });

      // A read-granted token: it can see the asset but must not be able to edit it.
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        name: 'hijacked.jpg',
      });

      expectToolDisabled(response, 'media_update_asset');
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        name: 'readonly.jpg',
        alternativeText: 'untouched',
      });
    });

    test('denies the write to a token holding an unrelated upload permission', async () => {
      const seeded = await seeder.seedAsset({ name: 'unrelated.jpg' });

      const token = await createAdminToken([permission(UPLOAD_ACTIONS.settingsRead)]);
      await mcp.initializeSession(token.accessKey);

      expect(await mcp.listToolNames(token.accessKey)).not.toContain('media_update_asset');

      const response = await mcp.callTool(token.accessKey, 'media_update_asset', {
        id: seeded.id,
        name: 'hijacked.jpg',
      });

      expectToolDisabled(response, 'media_update_asset');
    });
  });
  /**
   * Folder read-backs, shared by the folder CRUD suite and by `media_move_assets` — which has to prove
   * a folder id passed among asset ids left the folder tree alone.
   */
  const readTree = async (accessKey: string) => {
    const response = await mcp.callTool(accessKey, 'media_list_folders', {});
    expect(response.error).toBeUndefined();
    return response.result?.structuredContent?.data as Array<Record<string, unknown>>;
  };

  const folderRow = async (id: number) =>
    strapi.db.query('plugin::upload.folder').findOne({ where: { id } });

  // ---------------------------------------------------------------------------
  // Folder CRUD
  // ---------------------------------------------------------------------------

  describe('folder CRUD', () => {
    const structured = (response: Awaited<ReturnType<typeof mcp.callTool>>) =>
      response.result?.structuredContent?.data as Record<string, unknown>;

    const countFolders = async () => strapi.db.query('plugin::upload.folder').count({});
    const countFiles = async () => strapi.db.query('plugin::upload.file').count({});

    describe('media_create_folder', () => {
      test('creates a folder at the root, visible to media_list_folders', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Campaigns',
        });

        expect(response.error).toBeUndefined();
        expect(response.result?.isError).not.toBe(true);
        expect(structured(response)).toMatchObject({ name: 'Campaigns', parent: null });

        const tree = await readTree(token.accessKey);
        expect(tree).toHaveLength(1);
        expect(tree[0]).toMatchObject({ name: 'Campaigns', children: [] });
      });

      test('nests a folder under an existing parent', async () => {
        const parent = await seeder.seedFolder('Parent');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Nested',
          parent: parent.id,
        });

        expectToolOk(response);
        expect(structured(response)).toMatchObject({
          name: 'Nested',
          parent: { id: parent.id },
        });

        const tree = await readTree(token.accessKey);
        expect(tree[0].children).toHaveLength(1);
        expect((tree[0].children as Array<Record<string, unknown>>)[0]).toMatchObject({
          name: 'Nested',
        });
      });

      test('does not expose the internal path bookkeeping', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Clean',
        });

        expect(structured(response)).not.toHaveProperty('path');
        expect(structured(response)).not.toHaveProperty('pathId');
      });

      test('rejects a duplicate name within the same parent', async () => {
        const parent = await seeder.seedFolder('Parent');
        await seeder.seedFolder('Taken', parent.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Taken',
          parent: parent.id,
        });

        expectExecutionError(response, 'media_create_folder', MESSAGES.folderNameTaken);
        expect(await countFolders()).toBe(2);
      });

      test('allows the same name under a different parent', async () => {
        const first = await seeder.seedFolder('First');
        const second = await seeder.seedFolder('Second');
        await seeder.seedFolder('Shared', first.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Shared',
          parent: second.id,
        });

        expectToolOk(response);
      });

      test('rejects a parent that does not exist', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Orphan',
          parent: 999999,
        });

        expectExecutionError(response, 'media_create_folder', MESSAGES.parentFolderNotFound);
        expect(await countFolders()).toBe(0);
      });

      test('rejects a name containing a slash', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'a/b',
        });

        expectInputValidationError(response, MESSAGES.folderNameSlash);
        expect(await countFolders()).toBe(0);
      });

      test('denies the write to a token without plugin::upload.assets.create', async () => {
        const token = await createReadTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Denied',
        });

        expectToolDisabled(response, 'media_create_folder');
        expect(await countFolders()).toBe(0);
      });

      test('denies a token holding Update but not Create, matching POST /upload/folders', async () => {
        // The admin route for this operation requires `assets.create`, so Update alone must not
        // be enough here either — otherwise MCP grants what the panel refuses.
        const token = await createUpdateOnlyTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_create_folder', {
          name: 'Escalated',
        });

        expectToolDisabled(response, 'media_create_folder');
        expect(await countFolders()).toBe(0);
      });
    });

    describe('media_rename_folder', () => {
      test('renames a folder, confirmed by media_list_folders', async () => {
        const folder = await seeder.seedFolder('Before');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'After',
        });

        expectToolOk(response);
        expect(structured(response)).toMatchObject({ id: folder.id, name: 'After' });

        const tree = await readTree(token.accessKey);
        expect(tree[0]).toMatchObject({ id: folder.id, name: 'After' });
      });

      test('leaves the folder location and its contents in place', async () => {
        const parent = await seeder.seedFolder('Parent');
        const folder = await seeder.seedFolder('Child', parent.id);
        const asset = await seeder.seedAsset({ name: 'inside.jpg', folderId: folder.id });
        const token = await createUpdateTokenSession();

        const before = await folderRow(folder.id);

        await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'Renamed child',
        });

        // A rename must not touch the materialized path, so nothing below it moves.
        const after = await folderRow(folder.id);
        expect(after.path).toBe(before.path);

        const listed = await mcp.callTool(token.accessKey, 'media_list_assets', {
          folderId: folder.id,
        });
        expect(
          (listed.result?.structuredContent?.results as Record<string, unknown>[]).map(
            (file) => file.id
          )
        ).toEqual([asset.id]);
      });

      test('rejects a duplicate name within the same parent', async () => {
        const parent = await seeder.seedFolder('Parent');
        await seeder.seedFolder('Sibling', parent.id);
        const folder = await seeder.seedFolder('Target', parent.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'Sibling',
        });

        expectExecutionError(response, 'media_rename_folder', MESSAGES.folderNameTaken);
        expect((await folderRow(folder.id)).name).toBe('Target');
      });

      test('accepts renaming a folder to its own current name', async () => {
        // The uniqueness check excludes the folder itself, so this must not self-collide.
        const folder = await seeder.seedFolder('Unchanged');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'Unchanged',
        });

        expectToolOk(response);
      });

      test('rejects a parent, pointing the caller at media_move_folder', async () => {
        const folder = await seeder.seedFolder('Fixed');
        const destination = await seeder.seedFolder('Destination');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'Fixed',
          parent: destination.id,
        });

        expectInputValidationError(response, MESSAGES.renameOnlyName);
        expect(JSON.stringify(response)).toMatch(/media_move_folder/);
      });

      test('errors for an unknown folder id', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: 999999,
          name: 'Ghost',
        });

        expectExecutionError(response, 'media_rename_folder', MESSAGES.folderNotFound);
      });

      test('denies the write to a token without plugin::upload.assets.update', async () => {
        const folder = await seeder.seedFolder('Protected');
        const token = await createReadTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_rename_folder', {
          id: folder.id,
          name: 'Hijacked',
        });

        expectToolDisabled(response, 'media_rename_folder');
        expect((await folderRow(folder.id)).name).toBe('Protected');
      });
    });

    describe('media_move_folder', () => {
      test('re-parents a folder, confirmed by media_list_folders', async () => {
        const source = await seeder.seedFolder('Source');
        const destination = await seeder.seedFolder('Destination');
        const moved = await seeder.seedFolder('Moving', source.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: moved.id,
          parent: destination.id,
        });

        expectToolOk(response);
        expect(structured(response)).toMatchObject({
          id: moved.id,
          name: 'Moving',
          parent: { id: destination.id },
        });

        const tree = await readTree(token.accessKey);
        const byName = Object.fromEntries(tree.map((node) => [node.name, node]));
        expect(byName.Source.children).toEqual([]);
        expect((byName.Destination.children as Array<Record<string, unknown>>)[0]).toMatchObject({
          name: 'Moving',
        });
      });

      test('carries subfolders and files with it, rewriting their paths', async () => {
        const destination = await seeder.seedFolder('Destination');
        const moved = await seeder.seedFolder('Moving');
        const child = await seeder.seedFolder('Deep', moved.id);
        const asset = await seeder.seedAsset({ name: 'carried.jpg', folderId: child.id });
        const token = await createUpdateTokenSession();

        await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: moved.id,
          parent: destination.id,
        });

        // The service rewrites the whole subtree inside a transaction: the descendant folder
        // and the contained file must both sit under the new path.
        const destinationRow = await folderRow(destination.id);
        const childRow = await folderRow(child.id);
        expect(childRow.path.startsWith(`${destinationRow.path}/`)).toBe(true);

        const file = await strapi.db
          .query('plugin::upload.file')
          .findOne({ where: { id: asset.id } });
        expect(file.folderPath.startsWith(`${destinationRow.path}/`)).toBe(true);

        // ...and the asset is still reachable through its folder.
        const listed = await mcp.callTool(token.accessKey, 'media_list_assets', {
          folderId: child.id,
        });
        expect(
          (listed.result?.structuredContent?.results as Record<string, unknown>[]).map(
            (entry) => entry.id
          )
        ).toEqual([asset.id]);
      });

      test('moves a folder to the media library root with parent: null', async () => {
        const parent = await seeder.seedFolder('Parent');
        const child = await seeder.seedFolder('Child', parent.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: child.id,
          parent: null,
        });

        expectToolOk(response);
        expect(structured(response)).toMatchObject({ parent: null });

        const tree = await readTree(token.accessKey);
        expect(tree.map((node) => node.name).sort()).toEqual(['Child', 'Parent']);
      });

      test('rejects a move into the folder itself', async () => {
        const folder = await seeder.seedFolder('Selfish');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: folder.id,
          parent: folder.id,
        });

        expectExecutionError(response, 'media_move_folder', MESSAGES.moveIntoSelf);
        expect((await folderRow(folder.id)).path).toBe(folder.path);
      });

      test('rejects a move into its own subtree, leaving the tree intact', async () => {
        const parent = await seeder.seedFolder('Ancestor');
        const child = await seeder.seedFolder('Descendant', parent.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: parent.id,
          parent: child.id,
        });

        expectExecutionError(response, 'media_move_folder', MESSAGES.moveIntoSelf);

        // A cycle here would orphan the whole subtree, so the paths must be untouched.
        expect((await folderRow(parent.id)).path).toBe(parent.path);
        expect((await folderRow(child.id)).path).toBe(child.path);
      });

      test('rejects a destination that does not exist', async () => {
        const folder = await seeder.seedFolder('Stuck');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: folder.id,
          parent: 999999,
        });

        expectExecutionError(response, 'media_move_folder', MESSAGES.parentFolderNotFound);
        expect((await folderRow(folder.id)).path).toBe(folder.path);
      });

      test('rejects a move that would collide with a name in the destination', async () => {
        const destination = await seeder.seedFolder('Destination');
        await seeder.seedFolder('Clash', destination.id);
        const moving = await seeder.seedFolder('Clash');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: moving.id,
          parent: destination.id,
        });

        expectExecutionError(response, 'media_move_folder', MESSAGES.folderNameTaken);
        expect((await folderRow(moving.id)).path).toBe(moving.path);
      });

      test('rejects a name, pointing the caller at media_rename_folder', async () => {
        const folder = await seeder.seedFolder('Named');
        const destination = await seeder.seedFolder('Destination');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: folder.id,
          parent: destination.id,
          name: 'Renamed',
        });

        expectInputValidationError(response, MESSAGES.moveFolderOnlyParent);
        expect(JSON.stringify(response)).toMatch(/media_rename_folder/);
      });

      test('denies the write to a token without plugin::upload.assets.update', async () => {
        const folder = await seeder.seedFolder('Protected');
        const destination = await seeder.seedFolder('Destination');
        const token = await createReadTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_move_folder', {
          id: folder.id,
          parent: destination.id,
        });

        expectToolDisabled(response, 'media_move_folder');
        expect((await folderRow(folder.id)).path).toBe(folder.path);
      });
    });

    describe('media_delete_folder', () => {
      /**
       * A folder holding one file, one subfolder, and one file inside that subfolder:
       * deleting the root of it must cascade to 2 folders and 2 files.
       */
      const seedCascade = async () => {
        const root = await seeder.seedFolder('Doomed');
        const child = await seeder.seedFolder('Doomed child', root.id);
        const rootAsset = await seeder.seedAsset({ name: 'top.jpg', folderId: root.id });
        const childAsset = await seeder.seedAsset({ name: 'deep.jpg', folderId: child.id });

        return { root, child, rootAsset, childAsset };
      };

      test('dry-runs by default: reports the cascade counts and deletes nothing', async () => {
        const { root } = await seedCascade();
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
        });

        expectToolOk(response);
        expect(response.result?.structuredContent).toMatchObject({
          dryRun: true,
          totalFolderNumber: 2,
          totalFileNumber: 2,
        });

        // Proven by reading back: every folder and file is still in place.
        expect(await countFolders()).toBe(2);
        expect(await countFiles()).toBe(2);
        const tree = await readTree(token.accessKey);
        expect(tree).toHaveLength(1);
        expect(tree[0].children).toHaveLength(1);
      });

      test('dry-runs with dryRun: true, leaving everything in place', async () => {
        const { root } = await seedCascade();
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
          dryRun: true,
        });

        expect(response.result?.structuredContent).toMatchObject({
          dryRun: true,
          totalFolderNumber: 2,
          totalFileNumber: 2,
        });
        expect(await countFolders()).toBe(2);
        expect(await countFiles()).toBe(2);
      });

      test('names the folders it would delete without exposing their paths', async () => {
        const { root } = await seedCascade();
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
        });
        const folders = response.result?.structuredContent?.folders as Record<string, unknown>[];

        expect(folders).toHaveLength(1);
        expect(folders[0]).toMatchObject({ id: root.id, name: 'Doomed' });
        expect(folders[0]).not.toHaveProperty('path');
        expect(folders[0]).not.toHaveProperty('pathId');
      });

      test('does not claim a nested folder sits at the root', async () => {
        // `parent: null` means "at the media library root" in the output contract. The delete
        // lookup does not load the relation, so it must omit the key rather than assert null —
        // misdescribing the target's location in a destructive confirmation step.
        const parent = await seeder.seedFolder('Parent');
        const nested = await seeder.seedFolder('Nested', parent.id);
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [nested.id],
        });

        const folders = response.result?.structuredContent?.folders as Record<string, unknown>[];
        expect(folders[0]).toMatchObject({ id: nested.id, name: 'Nested' });

        // Absent means "not loaded"; null would be a false claim of root placement.
        expect('parent' in folders[0]).toBe(false);
      });

      test('deletes with dryRun: false, cascading over subfolders and files', async () => {
        const { root } = await seedCascade();
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
          dryRun: false,
        });

        expectToolOk(response);

        // The counts actually removed match what the dry run predicted for the same seed.
        expect(response.result?.structuredContent).toMatchObject({
          dryRun: false,
          totalFolderNumber: 2,
          totalFileNumber: 2,
        });

        expect(await countFolders()).toBe(0);
        expect(await countFiles()).toBe(0);
        expect(await readTree(token.accessKey)).toEqual([]);
      });

      test('the dry-run counts match what the destructive call then removes', async () => {
        const { root } = await seedCascade();
        const token = await createUpdateTokenSession();

        const preview = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
        });
        const executed = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
          dryRun: false,
        });

        // The two branches must agree — a preview an agent cannot trust is worse than none.
        expect(executed.result?.structuredContent?.totalFolderNumber).toBe(
          preview.result?.structuredContent?.totalFolderNumber
        );
        expect(executed.result?.structuredContent?.totalFileNumber).toBe(
          preview.result?.structuredContent?.totalFileNumber
        );
      });

      test('leaves folders outside the cascade untouched', async () => {
        const { root } = await seedCascade();
        const survivor = await seeder.seedFolder('Survivor');
        const survivingAsset = await seeder.seedAsset({
          name: 'safe.jpg',
          folderId: survivor.id,
        });
        const token = await createUpdateTokenSession();

        await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
          dryRun: false,
        });

        expect(await folderRow(survivor.id)).toMatchObject({ name: 'Survivor' });
        expect(
          await strapi.db.query('plugin::upload.file').findOne({ where: { id: survivingAsset.id } })
        ).toMatchObject({ name: 'safe.jpg' });
      });

      test('deletes several folders in one call', async () => {
        const first = await seeder.seedFolder('First');
        const second = await seeder.seedFolder('Second');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [first.id, second.id],
          dryRun: false,
        });

        expect(response.result?.structuredContent).toMatchObject({
          dryRun: false,
          totalFolderNumber: 2,
        });
        expect(await countFolders()).toBe(0);
      });

      test('rejects the whole call when one id does not resolve, deleting nothing', async () => {
        const folder = await seeder.seedFolder('Real');
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [folder.id, 999999],
          dryRun: false,
        });

        expectExecutionError(response, 'media_delete_folder', MESSAGES.unresolvedFolderIds);
        expect(JSON.stringify(response)).toMatch(/999999/);

        // The valid folder in the same request must survive: all or nothing.
        expect(await countFolders()).toBe(1);
        expect(await folderRow(folder.id)).toMatchObject({ name: 'Real' });
      });

      test('rejects a request mixing folder ids with asset ids, deleting neither', async () => {
        // The case the all-or-nothing rule exists for: the two id namespaces are
        // indistinguishable integers, so a mixed list is an agent mistake that must not
        // cascade through the folders that happened to match.
        const folder = await seeder.seedFolder('Keep me');
        const inside = await seeder.seedAsset({ name: 'inside.jpg', folderId: folder.id });
        const asset = await seeder.seedAsset({ name: 'not-a-folder.jpg' });
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [folder.id, asset.id],
          dryRun: false,
        });

        expectExecutionError(response, 'media_delete_folder', MESSAGES.unresolvedFolderIds);
        expect(JSON.stringify(response)).toMatch(/media_delete_assets/);

        // Nothing at all was removed — not the folder, not the file it contained.
        expect(await countFolders()).toBe(1);
        expect(await countFiles()).toBe(2);
        expect(
          await strapi.db.query('plugin::upload.file').findOne({ where: { id: inside.id } })
        ).toMatchObject({ name: 'inside.jpg' });
      });

      test('rejects an unresolvable id on the dry run too, before reporting any cascade', async () => {
        const folder = await seeder.seedFolder('Real');
        await seeder.seedAsset({ name: 'inside.jpg', folderId: folder.id });
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [folder.id, 999999],
        });

        // A preview must not describe a cascade the executing call would refuse.
        expectExecutionError(response, 'media_delete_folder', MESSAGES.unresolvedFolderIds);
        expect(response.result?.structuredContent?.totalFolderNumber).toBeUndefined();
        expect(await countFolders()).toBe(1);
      });

      test('rejects an asset id, naming media_delete_assets', async () => {
        // Folder and asset ids are indistinguishable integers, so an asset id here is a likely
        // agent mistake that must be refused rather than reported as an empty cascade.
        const asset = await seeder.seedAsset({ name: 'not-a-folder.jpg' });
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [asset.id],
          dryRun: false,
        });

        expectExecutionError(response, 'media_delete_folder', MESSAGES.unresolvedFolderIds);
        expect(JSON.stringify(response)).toMatch(/media_delete_assets/);

        // The asset must survive an attempt to delete it through the folder tool.
        expect(await countFiles()).toBe(1);
      });

      test('rejects an empty id list', async () => {
        const token = await createUpdateTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [],
          dryRun: false,
        });

        expectInputValidationError(response, MESSAGES.emptyIdList);
      });

      test('denies the delete to a token without plugin::upload.assets.update', async () => {
        const { root } = await seedCascade();
        const token = await createReadTokenSession();

        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
          dryRun: false,
        });

        expectToolDisabled(response, 'media_delete_folder');
        expect(await countFolders()).toBe(2);
        expect(await countFiles()).toBe(2);
      });

      test('denies even the dry run to a read-only token', async () => {
        const { root } = await seedCascade();
        const token = await createReadTokenSession();

        // The preview reveals how much content a folder holds, so it takes the write action too.
        const response = await mcp.callTool(token.accessKey, 'media_delete_folder', {
          ids: [root.id],
        });

        expectToolDisabled(response, 'media_delete_folder');
      });
    });
  });
  // ---------------------------------------------------------------------------
  // media_move_assets
  // ---------------------------------------------------------------------------

  describe('media_move_assets', () => {
    const structured = (response: Awaited<ReturnType<typeof mcp.callTool>>) =>
      response.result?.structuredContent as {
        destinationFolder: Record<string, unknown> | null;
        moved: Record<string, unknown>[];
        failed: { id: number; reason: string }[];
      };

    /** The stored row, so the private `folderPath` can be asserted alongside the relation. */
    const fileRow = async (id: number) =>
      strapi.db.query('plugin::upload.file').findOne({ where: { id }, populate: ['folder'] });

    const readBack = async (accessKey: string, id: number) => {
      const response = await mcp.callTool(accessKey, 'media_get_asset', { id });
      expect(response.error).toBeUndefined();
      return response.result?.structuredContent?.data as Record<string, unknown>;
    };

    /** Highest asset id currently in the database, or 0 when there are none. */
    const maxAssetId = async (): Promise<number> => {
      const rows = await strapi.db.query('plugin::upload.file').findMany({ select: ['id'] });
      return rows.reduce((highest: number, row: { id: number }) => Math.max(highest, row.id), 0);
    };

    /**
     * Seeds a folder and an asset that share the same numeric id.
     *
     * The two tables have independent sequences sitting at arbitrary offsets by the time these
     * tests run, so the collision is CONSTRUCTED rather than waited for: both rows are seeded
     * normally and the folder is then renumbered onto the asset's id with a direct update.
     *
     * Forcing it is the point. The api test this replaced asserted the opposite behaviour and
     * passed only because the two sequences happened to be apart — a fixture that produced a
     * collision by luck proved nothing, and hid a real bug from review.
     *
     * The caller must seed the destination folder AFTER this returns: the renumbered folder frees
     * its original id, and a destination seeded first can be sitting on the asset id this needs.
     */
    const seedIdCollision = async (assetName: string) => {
      const asset = await seeder.seedAsset({ name: assetName });
      const folder = await seeder.seedFolder(`Collides with ${assetName}`);

      // Renumber the folder onto the asset's id. `id` is not writable through the folder service,
      // so this goes straight to the row — the collision is the fixture, not the behaviour.
      await strapi.db
        .connection(strapi.getModel('plugin::upload.folder').collectionName)
        .where({ id: folder.id })
        .update({ id: asset.id });

      const renumbered = await folderRow(asset.id);
      expect(renumbered).toMatchObject({ id: asset.id, name: `Collides with ${assetName}` });
      expect(await fileRow(asset.id)).toMatchObject({ id: asset.id, name: assetName });

      return { collidingId: asset.id, folderName: renumbered.name as string, assetName };
    };

    test('moves several assets across folders in one call, confirmed by media_get_asset', async () => {
      const source = await seeder.seedFolder('Source');
      const destination = await seeder.seedFolder('Destination');
      const first = await seeder.seedAsset({ name: 'first.jpg', folderId: source.id });
      const second = await seeder.seedAsset({ name: 'second.jpg', folderId: source.id });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [first.id, second.id],
        folder: destination.id,
      });

      expectToolOk(response);

      const { destinationFolder, moved, failed } = structured(response);
      expect(destinationFolder).toMatchObject({ id: destination.id, name: 'Destination' });
      expect(moved.map((asset) => asset.id).sort()).toEqual([first.id, second.id].sort());
      expect(failed).toEqual([]);

      // The write response is authoritative on its own — no follow-up read required.
      for (const asset of moved) {
        expect(asset.folder).toMatchObject({ id: destination.id, name: 'Destination' });
      }

      // ...and the move is actually persisted, relation and private folderPath alike.
      expect(await readBack(token.accessKey, first.id)).toMatchObject({
        name: 'first.jpg',
        folder: { id: destination.id, name: 'Destination' },
      });
      expect(await fileRow(second.id)).toMatchObject({
        folder: { id: destination.id },
        folderPath: destination.path,
      });
    });

    test('moves an asset to the media library root with folder: null', async () => {
      const folder = await seeder.seedFolder('Somewhere');
      const seeded = await seeder.seedAsset({ name: 'homeward.jpg', folderId: folder.id });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: null,
      });

      expectToolOk(response);

      const { destinationFolder, moved } = structured(response);
      expect(destinationFolder).toBeNull();
      expect(moved[0]).toMatchObject({ id: seeded.id, folder: null });

      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({ folder: null });
      expect(await fileRow(seeded.id)).toMatchObject({ folder: null, folderPath: '/' });

      // media_list_assets's root filter is the read side of the same claim.
      const atRoot = await mcp.callTool(token.accessKey, 'media_list_assets', { folderId: null });
      expect(
        (atRoot.result?.structuredContent?.results as Record<string, unknown>[]).map(
          (asset) => asset.name
        )
      ).toEqual(['homeward.jpg']);
    });

    test('moves a single asset through the same bulk contract', async () => {
      const destination = await seeder.seedFolder('Solo');
      const seeded = await seeder.seedAsset({ name: 'alone.jpg' });

      const token = await createUpdateTokenSession();

      // An array of one is the whole difference — there is no single-asset move tool.
      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: destination.id,
      });

      expectToolOk(response);
      expect(structured(response).moved.map((asset) => asset.id)).toEqual([seeded.id]);
    });

    test('moves assets into a nested folder, recording its full path', async () => {
      const parent = await seeder.seedFolder('Parent');
      const nested = await seeder.seedFolder('Nested', parent.id);
      const seeded = await seeder.seedAsset({ name: 'deep.jpg' });

      const token = await createUpdateTokenSession();

      await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: nested.id,
      });

      // `folderPath` is the materialized path of the destination, not just its id: getting this
      // wrong would leave the asset invisible to the admin folder navigation.
      expect(await fileRow(seeded.id)).toMatchObject({
        folder: { id: nested.id },
        folderPath: nested.path,
      });
    });

    test('changes the folder only, leaving metadata and the public URL untouched', async () => {
      const destination = await seeder.seedFolder('Elsewhere');
      const seeded = await seeder.seedAsset({
        name: 'keep.jpg',
        alternativeText: 'keep alt',
        caption: 'keep caption',
      });

      const token = await createUpdateTokenSession();

      const before = await readBack(token.accessKey, seeded.id);

      await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: destination.id,
      });

      const after = await readBack(token.accessKey, seeded.id);

      // A move that broke live URLs would break every entry and page referencing the asset.
      expect(after).toMatchObject({
        name: 'keep.jpg',
        alternativeText: 'keep alt',
        caption: 'keep caption',
        url: before.url,
        mime: before.mime,
      });
    });

    test('returns the sanitized asset shape, with no provider secrets or private metadata', async () => {
      const destination = await seeder.seedFolder('Sanitized');
      const seeded = await seeder.seedAsset({ name: 'clean.jpg' });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: destination.id,
      });

      const [asset] = structured(response).moved;
      for (const field of FORBIDDEN_ASSET_FIELDS) {
        expect(asset).not.toHaveProperty(field);
      }
      expect(asset).not.toHaveProperty('documentId');
    });

    test('reports a partial failure per id and leaves the valid moves applied', async () => {
      const destination = await seeder.seedFolder('Partial');
      const good = await seeder.seedAsset({ name: 'good.jpg' });
      const alsoGood = await seeder.seedAsset({ name: 'also-good.jpg' });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [good.id, 999999, alsoGood.id],
        folder: destination.id,
      });

      // Partial success is reported, not discarded: the call succeeds and the report says
      // exactly which id to retry.
      expectToolOk(response);

      const { moved, failed } = structured(response);
      expect(moved.map((asset) => asset.id).sort()).toEqual([good.id, alsoGood.id].sort());
      expect(failed).toHaveLength(1);
      expect(failed[0].id).toBe(999999);
      expect(failed[0].reason).toMatch(/media_move_folder/);

      // The valid moves are committed — not rolled back by the bad id.
      expect(await fileRow(good.id)).toMatchObject({ folder: { id: destination.id } });
      expect(await fileRow(alsoGood.id)).toMatchObject({ folder: { id: destination.id } });
    });

    /**
     * ACCEPTED RISK, asserted so it cannot change unnoticed.
     *
     * Asset ids and folder ids are independent sequences, so the same integer can name both. The
     * tool resolves ids in the file table only: handed a folder id that collides with an asset
     * id, it moves THAT ASSET. Nothing in the input can express which namespace was meant, and
     * refusing every colliding id would make those assets permanently unmovable over MCP.
     *
     * The mitigation is the tool description, not a server-side check. The durable fix is
     * namespaced handles across the whole media surface (`asset:1` / `folder:1`), which is a
     * breaking change to the read tools and belongs to its own ticket.
     *
     * This test pins the real behaviour on a FORCED collision. The version it replaced asserted
     * the opposite and passed only because the fixture happened to avoid a collision — it proved
     * nothing, and hid this from review.
     */
    test('moves the colliding asset when a folder id doubles as an asset id', async () => {
      const { collidingId, assetName, folderName } = await seedIdCollision('collides.jpg');
      // Seeded last: the renumbered folder released its original id, which a destination created
      // earlier could have been holding.
      const destination = await seeder.seedFolder('Destination');
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [collidingId],
        folder: destination.id,
      });

      const { moved, failed } = structured(response);

      // The asset sharing the number moved; nothing is reported as failed.
      expect(moved.map((asset) => asset.id)).toEqual([collidingId]);
      expect(moved[0]).toMatchObject({ name: assetName, folder: { id: destination.id } });
      expect(failed).toEqual([]);
      expect(await fileRow(collidingId)).toMatchObject({ folder: { id: destination.id } });

      // ...and the folder the caller meant to move is exactly where it was.
      expect(await folderRow(collidingId)).toMatchObject({ id: collidingId, name: folderName });
      const tree = await readTree(token.accessKey);
      expect(tree.map((node) => node.name).sort()).toEqual([folderName, 'Destination'].sort());
    });

    test('reports a folder id that matches no asset as failed, moving nothing', async () => {
      // The guarantee this tool DOES make: a number that resolves to no asset moves nothing, and
      // the reason points at media_move_folder because a folder id is the likeliest cause.
      //
      // The id is forced past every asset id in the database, so the assertion holds on the id
      // itself rather than on whichever sequence values this test happened to draw.
      const destination = await seeder.seedFolder('Assets only');
      const bystander = await seeder.seedFolder('Not an asset');
      const seeded = await seeder.seedAsset({ name: 'real.jpg' });
      const unmatchedId = (await maxAssetId()) + 1000;

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id, unmatchedId],
        folder: destination.id,
      });

      const { moved, failed } = structured(response);
      expect(moved.map((asset) => asset.id)).toEqual([seeded.id]);
      expect(failed.map(({ id }) => id)).toEqual([unmatchedId]);
      expect(failed[0].reason).toMatch(/media_move_folder/);

      // The folder stayed at the root: it was never touched.
      expect(await folderRow(bystander.id)).toMatchObject({ name: 'Not an asset' });
      const tree = await readTree(token.accessKey);
      expect(tree.map((node) => node.name).sort()).toEqual(['Assets only', 'Not an asset']);
    });

    test('never re-parents the folder itself, whether or not its id collides', async () => {
      // The one thing that holds in both branches above: media_move_assets writes to the file table
      // only, so a folder passed in `ids` keeps its parent either way. Asserted on the folder
      // tree, which is what an agent would see next.
      const { collidingId, folderName } = await seedIdCollision('shares-a-number.jpg');
      const destination = await seeder.seedFolder('Destination');
      const untouched = await seeder.seedFolder('No asset shares this');
      const unmatchedId = (await maxAssetId()) + 1000;

      // The second folder is the non-colliding case, so its id must genuinely match no asset —
      // asserted rather than assumed, since that is the whole difference between the two branches.
      expect(await fileRow(untouched.id)).toBeNull();

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [collidingId, untouched.id, unmatchedId],
        folder: destination.id,
      });

      const { moved, failed } = structured(response);
      // Only the colliding asset moved; the two folder ids that match no asset failed.
      expect(moved.map((asset) => asset.id)).toEqual([collidingId]);
      expect(failed.map(({ id }) => id).sort()).toEqual([untouched.id, unmatchedId].sort());

      // Neither folder was re-parented: both are still at the root, alongside the destination.
      expect(await folderRow(collidingId)).toMatchObject({ id: collidingId, name: folderName });
      expect(await folderRow(untouched.id)).toMatchObject({ name: 'No asset shares this' });
      const tree = await readTree(token.accessKey);
      expect(tree.map((node) => node.name).sort()).toEqual(
        [folderName, 'Destination', 'No asset shares this'].sort()
      );
    });

    test('still reports per id when no id resolved at all', async () => {
      const destination = await seeder.seedFolder('Nothing moved');
      const token = await createUpdateTokenSession();

      // Nothing to preserve: an OK result would let an agent read a wholly rejected request as
      // a completed reorganisation.
      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [999998, 999999],
        folder: destination.id,
      });

      // A tool error would carry no structuredContent at all, so a single bad id would get
      // prose where a mixed request gets a machine-readable entry — the same mistake, two
      // different contracts.
      expectToolOk(response);

      const { moved, failed } = structured(response);
      expect(moved).toEqual([]);
      expect(failed.map(({ id }) => id).sort()).toEqual([999998, 999999]);
      expect(failed[0].reason).toMatch(/media_move_folder/);
    });

    test('rejects the whole call for a destination folder that does not exist', async () => {
      const source = await seeder.seedFolder('Stay put');
      const seeded = await seeder.seedAsset({ name: 'unmoved.jpg', folderId: source.id });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: 999999,
      });

      expectExecutionError(response, 'media_move_assets', MESSAGES.destinationNotFound);
      expect(JSON.stringify(response)).toMatch(/media_list_folders/);

      // A bad destination is a property of the request, so nothing moves — not even valid ids.
      expect(await fileRow(seeded.id)).toMatchObject({
        folder: { id: source.id },
        folderPath: source.path,
      });
    });

    test('rejects an asset id used as the destination folder, moving nothing', async () => {
      const source = await seeder.seedFolder('Origin');
      const seeded = await seeder.seedAsset({ name: 'stays.jpg', folderId: source.id });
      const notAFolder = await seeder.seedAsset({ name: 'not-a-folder.jpg' });

      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: notAFolder.id,
      });

      expectExecutionError(response, 'media_move_assets', MESSAGES.destinationNotFound);
      expect(await fileRow(seeded.id)).toMatchObject({ folder: { id: source.id } });
    });

    test('requires the destination, so a mistyped move cannot become a silent no-op', async () => {
      const seeded = await seeder.seedAsset({ name: 'needs-destination.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
      });

      expectInputValidationError(response, MESSAGES.expectedNumber);
    });

    test('rejects a scalar id, pointing the caller at the bulk ids array', async () => {
      const destination = await seeder.seedFolder('Bulk only');
      const seeded = await seeder.seedAsset({ name: 'scalar.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        id: seeded.id,
        folder: destination.id,
      });

      expectInputValidationError(response, MESSAGES.expectedArray);
      expect(await fileRow(seeded.id)).toMatchObject({ folder: null });
    });

    test('rejects a documentId in place of the numeric ids', async () => {
      const destination = await seeder.seedFolder('Numeric ids');
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: ['z7v8zma53x01r6oceimv922b'],
        folder: destination.id,
      });

      expectInputValidationError(response, MESSAGES.expectedNumber);
    });

    test('rejects an empty id list', async () => {
      const destination = await seeder.seedFolder('Empty');
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [],
        folder: destination.id,
      });

      expectInputValidationError(response, MESSAGES.emptyIdList);
    });

    test('denies the move to a token without plugin::upload.assets.update', async () => {
      const source = await seeder.seedFolder('Read only');
      const destination = await seeder.seedFolder('Off limits');
      const seeded = await seeder.seedAsset({ name: 'protected.jpg', folderId: source.id });

      // A read-granted token: it can see the asset but must not be able to move it.
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: destination.id,
      });

      expectToolDisabled(response, 'media_move_assets');
      expect(await readBack(token.accessKey, seeded.id)).toMatchObject({
        folder: { id: source.id, name: 'Read only' },
      });
    });

    test('denies the move to a token holding an unrelated upload permission', async () => {
      const destination = await seeder.seedFolder('Unrelated');
      const seeded = await seeder.seedAsset({ name: 'unrelated.jpg' });

      const token = await createAdminToken([permission(UPLOAD_ACTIONS.settingsRead)]);
      await mcp.initializeSession(token.accessKey);

      expect(await mcp.listToolNames(token.accessKey)).not.toContain('media_move_assets');

      const response = await mcp.callTool(token.accessKey, 'media_move_assets', {
        ids: [seeded.id],
        folder: destination.id,
      });

      expectToolDisabled(response, 'media_move_assets');
      expect(await fileRow(seeded.id)).toMatchObject({ folder: null });
    });
  });

  // ---------------------------------------------------------------------------
  // media_delete_assets
  // ---------------------------------------------------------------------------

  describe('media_delete_assets', () => {
    const structured = (response: Awaited<ReturnType<typeof mcp.callTool>>) =>
      response.result?.structuredContent as {
        dryRun: boolean;
        deleted: Record<string, unknown>[];
        failed: { id: number; reason: string }[];
        totalFileNumber: number;
      };

    const countFiles = async () => strapi.db.query('plugin::upload.file').count({});

    const fileRow = async (id: number) =>
      strapi.db.query('plugin::upload.file').findOne({ where: { id } });

    /** Highest asset id currently in the database, or 0 when there are none. */
    const maxAssetId = async (): Promise<number> => {
      const rows = await strapi.db.query('plugin::upload.file').findMany({ select: ['id'] });
      return rows.reduce((highest: number, row: { id: number }) => Math.max(highest, row.id), 0);
    };

    /**
     * Seeds a folder and an asset that share the same numeric id.
     *
     * The two tables have independent sequences sitting at arbitrary offsets by the time these
     * tests run, so the collision is CONSTRUCTED rather than waited for: both rows are seeded
     * normally and the folder is then renumbered onto the asset's id with a direct update.
     *
     * Forcing it is the point. The api tests these replaced asserted the opposite behaviour and
     * passed only because the sequences happened to be far apart — a fixture that produced a
     * collision by luck proved nothing, and hid a real data-loss bug from review.
     */
    const seedIdCollision = async (assetName: string) => {
      const asset = await seeder.seedAsset({ name: assetName });
      const folder = await seeder.seedFolder(`Collides with ${assetName}`);

      // Renumber the folder onto the asset's id. `id` is not writable through the folder service,
      // so this goes straight to the row — the collision is the fixture, not the behaviour.
      await strapi.db
        .connection(strapi.getModel('plugin::upload.folder').collectionName)
        .where({ id: folder.id })
        .update({ id: asset.id });

      const renumbered = await folderRow(asset.id);
      expect(renumbered).toMatchObject({ id: asset.id });
      expect(await fileRow(asset.id)).toMatchObject({ id: asset.id, name: assetName });

      return { collidingId: asset.id, assetName };
    };

    test('dry-runs by default: lists what would be deleted and deletes nothing', async () => {
      const first = await seeder.seedAsset({ name: 'doomed-one.jpg' });
      const second = await seeder.seedAsset({ name: 'doomed-two.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [first.id, second.id],
      });

      expectToolOk(response);

      const { dryRun, deleted, failed, totalFileNumber } = structured(response);
      expect(dryRun).toBe(true);
      expect(totalFileNumber).toBe(2);
      expect(deleted.map((asset) => asset.id).sort()).toEqual([first.id, second.id].sort());
      expect(failed).toEqual([]);

      // Proven by reading back: every asset is still there, and still readable over MCP.
      expect(await countFiles()).toBe(2);
      expect(await fileRow(first.id)).toMatchObject({ name: 'doomed-one.jpg' });
      const readBack = await mcp.callTool(token.accessKey, 'media_get_asset', { id: second.id });
      expect(readBack.result?.structuredContent?.data).toMatchObject({ name: 'doomed-two.jpg' });
    });

    test('dry-runs with dryRun: true, leaving everything in place', async () => {
      const asset = await seeder.seedAsset({ name: 'still-here.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
        dryRun: true,
      });

      expect(structured(response)).toMatchObject({ dryRun: true, totalFileNumber: 1 });
      expect(await countFiles()).toBe(1);
    });

    test('describes the assets it would delete, not just their count', async () => {
      const folder = await seeder.seedFolder('Preview');
      const asset = await seeder.seedAsset({ name: 'described.jpg', folderId: folder.id });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
      });
      const { deleted } = structured(response);

      // An agent has to report what it is about to destroy, so a bare count is not enough.
      expect(deleted[0]).toMatchObject({
        id: asset.id,
        name: 'described.jpg',
        folder: { id: folder.id, name: 'Preview' },
      });

      for (const field of FORBIDDEN_ASSET_FIELDS) {
        expect(deleted[0]).not.toHaveProperty(field);
      }
    });

    test('deletes with dryRun: false, removing the rows', async () => {
      const first = await seeder.seedAsset({ name: 'gone-one.jpg' });
      const second = await seeder.seedAsset({ name: 'gone-two.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [first.id, second.id],
        dryRun: false,
      });

      expectToolOk(response);
      expect(structured(response)).toMatchObject({ dryRun: false, totalFileNumber: 2 });

      expect(await countFiles()).toBe(0);

      // ...and the assets are gone from the read surface too.
      const readBack = await mcp.callTool(token.accessKey, 'media_get_asset', { id: first.id });
      expect(readBack.result?.structuredContent?.data ?? null).toBeNull();
    });

    test('deletes a single asset through the same bulk contract', async () => {
      const asset = await seeder.seedAsset({ name: 'single.jpg' });
      const survivor = await seeder.seedAsset({ name: 'survivor.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
        dryRun: false,
      });

      const { deleted, failed, totalFileNumber } = structured(response);
      expect(deleted.map((a) => a.id)).toEqual([asset.id]);
      expect(failed).toEqual([]);
      expect(totalFileNumber).toBe(1);

      // Assets outside the request are untouched.
      expect(await fileRow(survivor.id)).toMatchObject({ name: 'survivor.jpg' });
      expect(await countFiles()).toBe(1);
    });

    test('the dry-run report matches what the destructive call then deletes', async () => {
      const first = await seeder.seedAsset({ name: 'match-one.jpg' });
      const second = await seeder.seedAsset({ name: 'match-two.jpg' });
      const token = await createUpdateTokenSession();

      const preview = structured(
        await mcp.callTool(token.accessKey, 'media_delete_assets', { ids: [first.id, second.id] })
      );
      const executed = structured(
        await mcp.callTool(token.accessKey, 'media_delete_assets', {
          ids: [first.id, second.id],
          dryRun: false,
        })
      );

      // The two branches must agree — a preview an agent cannot trust is worse than none.
      expect(executed.totalFileNumber).toBe(preview.totalFileNumber);
      expect(executed.deleted.map((a) => a.id).sort()).toEqual(
        preview.deleted.map((a) => a.id).sort()
      );
      expect(executed.failed).toEqual(preview.failed);
    });

    test('leaves the containing folder in place — this tool deletes assets only', async () => {
      const folder = await seeder.seedFolder('Keeps its folder');
      const asset = await seeder.seedAsset({ name: 'inside.jpg', folderId: folder.id });
      const token = await createUpdateTokenSession();

      await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
        dryRun: false,
      });

      expect(await countFiles()).toBe(0);
      expect(await folderRow(folder.id)).toMatchObject({ name: 'Keeps its folder' });
    });

    test('applies the valid deletions and reports the bad id, without rolling back', async () => {
      const first = await seeder.seedAsset({ name: 'valid-one.jpg' });
      const second = await seeder.seedAsset({ name: 'valid-two.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [first.id, 999999, second.id],
        dryRun: false,
      });

      expectToolOk(response);

      const { deleted, failed, totalFileNumber } = structured(response);

      // The requirement this tool exists for: a bad id among good ones must not discard the
      // deletions that succeeded — and here they cannot be undone.
      expect(deleted.map((a) => a.id).sort()).toEqual([first.id, second.id].sort());
      expect(totalFileNumber).toBe(2);
      expect(failed).toHaveLength(1);
      expect(failed[0].id).toBe(999999);
      expect(failed[0].reason).toMatch(/media_delete_folder/);

      expect(await countFiles()).toBe(0);
    });

    test('reports a folder id that matches no asset as failed, deleting nothing', async () => {
      // The guarantee this tool DOES make: a number that resolves to no asset deletes nothing,
      // and the reason points at delete_folder because a folder id is the likeliest cause.
      //
      // The folder id is forced past every asset id in the database, so the assertion holds on
      // the id itself rather than on whichever sequence values this test happened to draw.
      const folder = await seeder.seedFolder('Not an asset');
      const inside = await seeder.seedAsset({ name: 'inside.jpg', folderId: folder.id });
      const unusedId = (await maxAssetId()) + 1000;
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [unusedId],
        dryRun: false,
      });

      const { deleted, failed, totalFileNumber } = structured(response);
      expect(deleted).toEqual([]);
      expect(totalFileNumber).toBe(0);
      expect(failed).toHaveLength(1);
      expect(failed[0].reason).toMatch(/media_delete_folder/);

      // Neither the folder nor its contents were touched.
      expect(await folderRow(folder.id)).toMatchObject({ name: 'Not an asset' });
      expect(await fileRow(inside.id)).toMatchObject({ name: 'inside.jpg' });
    });

    /**
     * ACCEPTED RISK, asserted so it cannot change unnoticed.
     *
     * Asset ids and folder ids are independent sequences, so the same integer can name both. The
     * tool resolves ids in the file table only: handed a folder id that collides with an asset
     * id, it deletes THAT ASSET. Nothing in the input can express which namespace was meant, and
     * refusing every colliding id would make those assets permanently undeletable over MCP.
     *
     * The mitigation is the dry run plus the tool description, not a server-side check. The
     * durable fix is namespaced handles across the whole media surface (`asset:1` / `folder:1`),
     * which is a breaking change to the read tools and belongs to its own ticket.
     *
     * This test pins the real behaviour on a FORCED collision. The previous version asserted the
     * opposite and passed only because earlier tests had advanced the two sequences apart — it
     * proved nothing, and hid this from review.
     */
    test('deletes the colliding asset when a folder id doubles as an asset id', async () => {
      const { collidingId, assetName } = await seedIdCollision('collides.jpg');
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [collidingId],
        dryRun: false,
      });

      const { deleted, failed } = structured(response);

      // The asset sharing the number is gone; the folder is untouched.
      expect(deleted.map((a) => a.id)).toEqual([collidingId]);
      expect(deleted[0]).toMatchObject({ name: assetName });
      expect(failed).toEqual([]);
      expect(await fileRow(collidingId)).toBeNull();
      expect(await folderRow(collidingId)).toMatchObject({ id: collidingId });
    });

    test('shows the colliding asset in the dry run, so a preview can catch the mistake', async () => {
      // The dry run is the only thing standing between an agent and this deletion, so the
      // preview must name the asset it would remove rather than report an empty result.
      const { collidingId, assetName } = await seedIdCollision('previewed.jpg');
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [collidingId],
      });

      const { dryRun, deleted } = structured(response);
      expect(dryRun).toBe(true);
      expect(deleted[0]).toMatchObject({ id: collidingId, name: assetName });

      // Still there: the preview destroyed nothing.
      expect(await fileRow(collidingId)).toMatchObject({ name: assetName });
    });

    test('reports an unresolvable id on the dry run too, before anything is destroyed', async () => {
      const asset = await seeder.seedAsset({ name: 'real.jpg' });
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id, 999999],
      });

      // The agent must learn which ids will not resolve *before* it deletes, not after.
      const { dryRun, deleted, failed } = structured(response);
      expect(dryRun).toBe(true);
      expect(deleted.map((a) => a.id)).toEqual([asset.id]);
      expect(failed.map(({ id }) => id)).toEqual([999999]);
      expect(await countFiles()).toBe(1);
    });

    test('still returns the per-id report when nothing was deleted at all', async () => {
      const token = await createUpdateTokenSession();

      // Throwing would drop `structuredContent`, so a single bad id would get prose where
      // `[valid, bad]` gets a machine-readable entry, for the same class of mistake.
      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [999998, 999999],
        dryRun: false,
      });

      expectToolOk(response);

      const { deleted, failed, totalFileNumber } = structured(response);
      expect(deleted).toEqual([]);
      expect(totalFileNumber).toBe(0);
      expect(failed.map(({ id }) => id)).toEqual([999998, 999999]);
    });

    test('rejects a documentId in place of the numeric ids', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: ['z7v8zma53x01r6oceimv922b'],
        dryRun: false,
      });

      expectInputValidationError(response, MESSAGES.expectedNumber);
    });

    test('rejects an empty id list', async () => {
      const token = await createUpdateTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [],
        dryRun: false,
      });

      expectInputValidationError(response, MESSAGES.emptyIdList);
    });

    test('denies the deletion to a token without plugin::upload.assets.update', async () => {
      const asset = await seeder.seedAsset({ name: 'protected.jpg' });

      // A read-granted token: it can see the asset but must not be able to delete it.
      const token = await createReadTokenSession();

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
        dryRun: false,
      });

      expectToolDisabled(response, 'media_delete_assets');
      expect(await fileRow(asset.id)).toMatchObject({ name: 'protected.jpg' });
      expect(await countFiles()).toBe(1);
    });

    test('denies even the dry run to a read-only token', async () => {
      const asset = await seeder.seedAsset({ name: 'protected.jpg' });
      const token = await createReadTokenSession();

      // The preview reveals which ids exist and what they are, so it takes the write action too.
      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
      });

      expectToolDisabled(response, 'media_delete_assets');
      expect(await countFiles()).toBe(1);
    });

    test('denies the deletion to a token holding an unrelated upload permission', async () => {
      const asset = await seeder.seedAsset({ name: 'unrelated.jpg' });

      const token = await createAdminToken([permission(UPLOAD_ACTIONS.settingsRead)]);
      await mcp.initializeSession(token.accessKey);

      expect(await mcp.listToolNames(token.accessKey)).not.toContain('media_delete_assets');

      const response = await mcp.callTool(token.accessKey, 'media_delete_assets', {
        ids: [asset.id],
        dryRun: false,
      });

      expectToolDisabled(response, 'media_delete_assets');
      expect(await fileRow(asset.id)).toMatchObject({ name: 'unrelated.jpg' });
    });
  });
});
