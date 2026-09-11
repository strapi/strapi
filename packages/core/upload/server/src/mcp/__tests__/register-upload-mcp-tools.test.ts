import type { Core } from '@strapi/types';
import {
  buildUploadMcpToolDefinitions,
  registerUploadMcpTools,
} from '../register-upload-mcp-tools';
import { ACTIONS } from '../../constants';

const makeStrapi = (options: { isEnabled?: boolean; withAi?: boolean } = {}) => {
  const { isEnabled = true, withAi = true } = options;
  const registerTool = jest.fn();

  const strapi = (withAi
    ? { ai: { mcp: { isEnabled: jest.fn(() => isEnabled), registerTool } } }
    : {}) as unknown as Core.Strapi;

  return { strapi, registerTool };
};

const READ_TOOLS = ['media_list_assets', 'media_get_asset', 'media_list_folders'];

const FOLDER_WRITE_TOOLS = [
  'media_create_folder',
  'media_rename_folder',
  'media_move_folder',
  'media_delete_folder',
];

const WRITE_TOOLS = [
  'media_update_asset',
  'media_move_assets',
  'media_delete_assets',
  ...FOLDER_WRITE_TOOLS,
];

describe('upload MCP tool registration', () => {
  describe('registration', () => {
    test('registers every read tool', () => {
      const { strapi, registerTool } = makeStrapi();

      registerUploadMcpTools({ strapi });

      expect(registerTool).toHaveBeenCalledTimes(10);
      expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
        ...READ_TOOLS,
        ...WRITE_TOOLS,
      ]);
    });

    test('names every tool so the content-manager can never derive the same one', () => {
      // The content-manager derives `<verb>_<slug>` per content type, in bootstrap — after this
      // runs in register. registerTool throws on a duplicate name and nothing catches it, so a
      // project with a content type named `media` or `folders` would fail to boot on a clash.
      // Every derived name starts with a verb, so a media_ prefix is unreachable by derivation.
      const { strapi, registerTool } = makeStrapi();

      registerUploadMcpTools({ strapi });

      for (const [tool] of registerTool.mock.calls) {
        expect(tool.name).toMatch(/^media_/);
      }
    });

    test('registers the tools even when the MCP server is disabled', () => {
      // registerTool() only stores the definition; the server is what withholds a disabled
      // tool from clients. Registering unconditionally keeps this function free of a gate
      // that would have to stay in sync with core's own enablement rules.
      const { strapi, registerTool } = makeStrapi({ isEnabled: false });

      registerUploadMcpTools({ strapi });

      expect(registerTool).toHaveBeenCalledTimes(10);
    });

    test('does not throw when strapi.ai is unavailable', () => {
      const { strapi, registerTool } = makeStrapi({ withAi: false });

      expect(() => registerUploadMcpTools({ strapi })).not.toThrow();
      expect(registerTool).not.toHaveBeenCalled();
    });
  });

  describe('definitions', () => {
    const tools = buildUploadMcpToolDefinitions();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    test('gates every read tool on plugin::upload.read', () => {
      // `plugin::upload.read` is registered without a subject, so the policy carries an action
      // only. The per-model check lives in the handlers, via the permissions manager.
      for (const name of READ_TOOLS) {
        expect(byName[name].auth.policies).toEqual([{ action: ACTIONS.read }]);
      }
    });

    test('gates the asset writes on plugin::upload.assets.update, not on read', () => {
      // A read-only token must never reach a write tool, so the write action is the gate.
      expect(byName.media_update_asset.auth.policies).toEqual([{ action: ACTIONS.update }]);
      expect(byName.media_move_assets.auth.policies).toEqual([{ action: ACTIONS.update }]);
      expect(byName.media_delete_assets.auth.policies).toEqual([{ action: ACTIONS.update }]);
    });

    test('does not pin a policy to a subject the action was never registered with', () => {
      for (const tool of tools) {
        for (const policy of tool.auth.policies) {
          expect(policy).not.toHaveProperty('subject');
        }
      }
    });

    test('never gates a read tool on a write action', () => {
      const actions = READ_TOOLS.flatMap((name) =>
        byName[name].auth.policies.map((policy) => policy.action)
      );

      expect(actions).not.toContain(ACTIONS.update);
      expect(actions).not.toContain(ACTIONS.create);
    });

    test('gates only media_create_folder on the create action — uploading is out of scope', () => {
      // `assets.create` is the permission the admin's own `POST /upload/folders` route requires,
      // so creating a folder over MCP has to ask for it too — a role with Update but not Create
      // cannot create a folder in the panel and must not be able to over MCP. No tool uploads a
      // file, which is what keeps `create` off every other definition.
      const gatedOnCreate = tools
        .filter((tool) => tool.auth.policies.some((policy) => policy.action === ACTIONS.create))
        .map((tool) => tool.name);

      expect(gatedOnCreate).toEqual(['media_create_folder']);
    });

    test('tags telemetry with the upload source', () => {
      for (const tool of tools) {
        expect(tool.telemetry.source).toBe('upload');
      }
    });

    test('documents that media uses numeric ids, not documentIds', () => {
      // The content-manager tools key on documentId, which files do not have.
      expect(byName.media_get_asset.description).toMatch(/numeric id/i);
      expect(byName.media_get_asset.description).toMatch(/not documents/i);
    });

    test('exposes an input schema for the tools that take arguments, and none for the folder tree', () => {
      expect(byName.media_list_assets.resolveInputSchema).toBeDefined();
      expect(byName.media_get_asset.resolveInputSchema).toBeDefined();
      expect(byName.media_update_asset.resolveInputSchema).toBeDefined();
      expect(byName.media_list_folders.resolveInputSchema).toBeUndefined();
    });

    test('points media_update_asset at the right tool for a folder change', () => {
      // An agent that wants to move an asset must be steered from the tool description alone.
      expect(byName.media_update_asset.description).toMatch(/media_move_assets/);
      expect(byName.media_update_asset.description).toMatch(/numeric id/i);
    });

    test('gates each folder write on the same action as its admin route', () => {
      // Folder writes inherit the existing asset permissions rather than folder-specific ones:
      // MCP-specific folder RBAC is explicitly out of scope. Which asset permission is not
      // uniform, though — it mirrors the admin route for the same operation, so that a role can
      // do exactly as much over MCP as it can in the panel:
      //   POST   /upload/folders      -> assets.create
      //   PUT    /upload/folders/:id  -> assets.update  (rename + move)
      //   bulk delete                 -> assets.update
      expect(byName.media_create_folder.auth.policies).toEqual([{ action: ACTIONS.create }]);

      for (const name of ['media_rename_folder', 'media_move_folder', 'media_delete_folder']) {
        expect(byName[name].auth.policies).toEqual([{ action: ACTIONS.update }]);
      }
    });

    test('gives every folder write a short-verb telemetry name', () => {
      const expected = {
        media_create_folder: 'create_folder',
        media_rename_folder: 'rename_folder',
        media_move_folder: 'move_folder',
        media_delete_folder: 'delete_folder',
      };

      for (const [name, telemetryName] of Object.entries(expected)) {
        expect(byName[name].telemetry.name).toBe(telemetryName);
      }
    });

    test('registers rename and move as two separate tools', () => {
      // Both call `folder.update` underneath, but an agent picks by intent: rename changes an
      // attribute, move changes a location — the same split as the asset surface.
      expect(byName.media_rename_folder).toBeDefined();
      expect(byName.media_move_folder).toBeDefined();
      expect(byName.media_rename_folder.description).toMatch(/media_move_folder/);
      expect(byName.media_move_folder.description).toMatch(/media_rename_folder/);
    });

    test('states that media_rename_folder does not change a folder location', () => {
      expect(byName.media_rename_folder.description).toMatch(/name only/i);
    });

    test('states that media_move_folder carries the subtree and rejects its own descendants', () => {
      expect(byName.media_move_folder.description).toMatch(/subfolders and files/i);
      expect(byName.media_move_folder.description).toMatch(/cannot be moved into itself/i);
    });

    test('names the destructive, irreversible, cascading behaviour in media_delete_folder', () => {
      // An agent reads the description as its only warning before an irreversible call.
      const { description } = byName.media_delete_folder;

      expect(description).toMatch(/destructive/i);
      expect(description).toMatch(/irreversible/i);
      expect(description).toMatch(/cascade/i);
      expect(description).toMatch(/permanently/i);
      expect(description).toMatch(/no undo/i);
    });

    test('warns in media_delete_folder that usage information is unavailable', () => {
      // "Used in" detection is not in the Media Library MVP, so the tool cannot say whether
      // a contained asset is referenced by a live entry — and must say so.
      const { description } = byName.media_delete_folder;

      expect(description).toMatch(/used in/i);
      expect(description).toMatch(/cannot (tell|be checked)/i);
    });

    test('steers media_delete_folder to the dry run first, and to media_delete_assets for assets', () => {
      const { description } = byName.media_delete_folder;

      expect(description).toMatch(/dryRun/);
      expect(description).toMatch(/media_delete_assets/);
      expect(description).toMatch(/FOLDER ids only/);
    });

    test('defaults media_delete_folder to a preview, so deleting needs an explicit opt-in', () => {
      // `dryRun` is optional and the handler defaults it to true: omitting the flag must be the
      // safe branch, never the destructive one.
      const schema = byName.media_delete_folder.resolveInputSchema?.(
        {} as Parameters<NonNullable<typeof byName.media_delete_folder.resolveInputSchema>>[0]
      );

      const parsed = schema?.safeParse({ ids: [1] });
      expect(parsed?.success).toBe(true);
      expect((parsed as { data: Record<string, unknown> })?.data.dryRun).toBeUndefined();
    });

    test('exposes an input schema for every folder write', () => {
      for (const name of FOLDER_WRITE_TOOLS) {
        expect(byName[name].resolveInputSchema).toBeDefined();
      }
    });

    test('publishes every folder write as a plain object schema the registry can expose', () => {
      // A `.refine()` anywhere here would produce a ZodEffects the tool registry cannot turn
      // into an input JSON Schema.
      for (const name of FOLDER_WRITE_TOOLS) {
        const schema = byName[name].resolveInputSchema?.(
          {} as Parameters<NonNullable<typeof byName.media_create_folder.resolveInputSchema>>[0]
        );

        expect(schema?.shape).toBeDefined();
      }
    });

    test('documents that folders use numeric ids, not documentIds', () => {
      for (const name of FOLDER_WRITE_TOOLS) {
        expect(byName[name].description).toMatch(/numeric id/i);
      }
    });

    test('registers media_move_assets with the short-verb telemetry name', () => {
      expect(byName.media_move_assets.telemetry.name).toBe('move');
    });

    test('registers one bulk-capable media_move_assets rather than a separate single-asset tool', () => {
      // Single-vs-bulk is an array length, not a distinction an agent can get wrong, so a
      // second tool would add a choice without removing a mistake.
      expect(byName.bulk_move_media).toBeUndefined();
      expect(byName.media_move_assets.description).toMatch(/bulk/i);
      expect(byName.media_move_assets.description).toMatch(/array of one/i);
    });

    test('states in media_move_assets that it takes asset ids and points folders at media_move_folder', () => {
      // Asset ids and folder ids are indistinguishable integers, so the description is the only
      // thing standing between an agent and a folder id passed as an asset.
      const { description } = byName.media_move_assets;

      expect(description).toMatch(/ASSET ids only/);
      expect(description).toMatch(/media_move_folder/);
      expect(description).toMatch(/not documents/i);
    });

    test('warns in media_move_assets that a folder id moves the asset sharing its number', () => {
      // The server cannot catch this — asset and folder ids are independently numbered and a
      // bare `ids` array cannot say which namespace was meant — so the description IS the
      // mitigation. It must not imply a folder id is harmless here.
      const { description } = byName.media_move_assets;

      expect(description).toMatch(/NEVER PASS A FOLDER ID/);
      expect(description).toMatch(/same number often names both/i);
      expect(description).toMatch(/media_list_assets/);
      // ...and it must not claim the tool refuses folder ids, which it cannot do.
      expect(description).not.toMatch(/folder ids are rejected/i);
      expect(description).not.toMatch(/does not resolve to an asset is refused/i);
    });

    test('warns in media_move_assets that a partial failure is not rolled back', () => {
      // An agent that reads a failed call as all-or-nothing would either retry moves that
      // already happened or abandon ones that did not.
      const { description } = byName.media_move_assets;

      expect(description).toMatch(/partial success/i);
      expect(description).toMatch(/does NOT roll/i);
      expect(description).toMatch(/`failed`/);
      // The report is unconditional, so an agent never has to parse prose to learn what moved.
      expect(description).toMatch(/always reports/i);
      expect(description).toMatch(/even when nothing moved/i);
    });

    test('documents media_move_assets root moves and the required destination', () => {
      expect(byName.media_move_assets.description).toMatch(/folder: null/);
      expect(byName.media_move_assets.description).toMatch(/media library root/i);
    });

    test('publishes media_move_assets as a plain object schema the registry can expose', () => {
      const schema = byName.media_move_assets.resolveInputSchema?.(
        {} as Parameters<NonNullable<typeof byName.media_move_assets.resolveInputSchema>>[0]
      );

      expect(schema?.shape).toBeDefined();
      expect(Object.keys(schema?.shape ?? {}).sort()).toEqual(['folder', 'ids']);
    });

    test('publishes media_update_asset as a plain object schema the registry can expose', () => {
      // A `.refine()` would make this a ZodEffects, which the tool registry cannot convert to
      // an input JSON Schema — the "at least one field" rule lives in the handler instead.
      const schema = byName.media_update_asset.resolveInputSchema?.(
        {} as Parameters<NonNullable<typeof byName.media_update_asset.resolveInputSchema>>[0]
      );

      expect(schema?.shape).toBeDefined();
      expect(Object.keys(schema?.shape ?? {}).sort()).toEqual([
        'alternativeText',
        'caption',
        'id',
        'name',
      ]);
    });

    test('registers media_delete_assets with the short-verb telemetry name', () => {
      expect(byName.media_delete_assets.telemetry.name).toBe('delete');
    });

    test('registers one bulk-capable media_delete_assets rather than a separate single-asset tool', () => {
      // Single-vs-bulk is an array length, and the admin REST API agrees: `/actions/bulk-delete`
      // is the only delete route.
      expect(byName.bulk_delete_media).toBeUndefined();
      expect(byName.media_delete_assets.description).toMatch(/bulk/i);
      expect(byName.media_delete_assets.description).toMatch(/array of one/i);
    });

    test('names the destructive, irreversible behaviour in media_delete_assets', () => {
      // An agent reads the description as its only warning before a call with no undo.
      const { description } = byName.media_delete_assets;

      expect(description).toMatch(/destructive/i);
      expect(description).toMatch(/irreversible/i);
      expect(description).toMatch(/permanently/i);
      expect(description).toMatch(/no undo/i);
      // The provider file goes too, not just the row.
      expect(description).toMatch(/storage provider/i);
    });

    test('warns in media_delete_assets that usage information is unavailable', () => {
      // "Used in" detection is not in the Media Library MVP, so the tool cannot say whether an
      // asset is referenced by a live entry — and must not imply the delete is safe.
      const { description } = byName.media_delete_assets;

      expect(description).toMatch(/used in/i);
      expect(description).toMatch(/cannot (tell|be checked)/i);
    });

    test('steers media_delete_assets to the dry run first, and to media_delete_folder for folders', () => {
      const { description } = byName.media_delete_assets;

      expect(description).toMatch(/dryRun/);
      expect(description).toMatch(/media_delete_folder/);
      expect(description).toMatch(/ASSET ids/);
      expect(description).toMatch(/not documents/i);
    });

    test('warns in media_delete_assets that a folder id deletes the asset sharing its number', () => {
      // The server cannot catch this — asset and folder ids are independently numbered and a
      // bare `ids` array cannot say which namespace was meant — so the description IS the
      // mitigation, alongside the dry run. It must not imply a folder id is harmless here.
      const { description } = byName.media_delete_assets;

      expect(description).toMatch(/NEVER PASS A FOLDER ID/);
      expect(description).toMatch(/same number often names both/i);
      expect(description).toMatch(/media_list_assets/);
      // ...and it must not claim the tool refuses folder ids, which it cannot do.
      expect(description).not.toMatch(/folder ids are rejected/i);
    });

    test('defaults media_delete_assets to a preview, so deleting needs an explicit opt-in', () => {
      // `dryRun` is optional and the handler defaults it to true: omitting the flag must be the
      // safe branch, never the destructive one.
      const schema = byName.media_delete_assets.resolveInputSchema?.(
        {} as Parameters<NonNullable<typeof byName.media_delete_assets.resolveInputSchema>>[0]
      );

      const parsed = schema?.safeParse({ ids: [1] });
      expect(parsed?.success).toBe(true);
      expect((parsed as { data: Record<string, unknown> })?.data.dryRun).toBeUndefined();
    });

    test('warns in media_delete_assets that a partial failure is not rolled back', () => {
      const { description } = byName.media_delete_assets;

      expect(description).toMatch(/partial success/i);
      expect(description).toMatch(/does NOT roll/i);
      expect(description).toMatch(/`failed`/);
      expect(description).toMatch(/always reports/i);
    });

    test('publishes media_delete_assets as a plain object schema the registry can expose', () => {
      const schema = byName.media_delete_assets.resolveInputSchema?.(
        {} as Parameters<NonNullable<typeof byName.media_delete_assets.resolveInputSchema>>[0]
      );

      expect(schema?.shape).toBeDefined();
      expect(Object.keys(schema?.shape ?? {}).sort()).toEqual(['dryRun', 'ids']);
    });
  });
});
