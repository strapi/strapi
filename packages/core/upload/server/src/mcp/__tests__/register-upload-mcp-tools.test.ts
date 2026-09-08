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

describe('upload MCP tool registration', () => {
  describe('registration', () => {
    test('registers every read tool', () => {
      const { strapi, registerTool } = makeStrapi();

      registerUploadMcpTools({ strapi });

      expect(registerTool).toHaveBeenCalledTimes(3);
      expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
        'media_list_assets',
        'media_get_asset',
        'media_list_folders',
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

      expect(registerTool).toHaveBeenCalledTimes(3);
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
      for (const tool of tools) {
        expect(tool.auth.policies).toEqual([{ action: ACTIONS.read }]);
      }
    });

    test('does not pin a policy to a subject the action was never registered with', () => {
      for (const tool of tools) {
        for (const policy of tool.auth.policies) {
          expect(policy).not.toHaveProperty('subject');
        }
      }
    });

    test('never gates a read tool on a write action', () => {
      const actions = tools.flatMap((tool) => tool.auth.policies.map((policy) => policy.action));

      expect(actions).not.toContain(ACTIONS.update);
      expect(actions).not.toContain(ACTIONS.create);
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
      expect(byName.media_list_folders.resolveInputSchema).toBeUndefined();
    });
  });
});
