import type { Core } from '@strapi/types';
import {
  buildUploadMcpToolDefinitions,
  registerUploadMcpTools,
} from '../register-upload-mcp-tools';
import { ACTIONS } from '../../constants';

const makeStrapi = (options: { isEnabled?: boolean; withAi?: boolean } = {}) => {
  const { isEnabled = true, withAi = true } = options;
  const registerTool = jest.fn();

  const strapi = {
    ...(withAi ? { ai: { mcp: { isEnabled: jest.fn(() => isEnabled), registerTool } } } : {}),
  } as unknown as Core.Strapi;

  return { strapi, registerTool };
};

describe('upload MCP tool registration', () => {
  describe('gating', () => {
    test('registers every read tool when the MCP server is enabled', () => {
      const { strapi, registerTool } = makeStrapi({ isEnabled: true });

      registerUploadMcpTools({ strapi });

      expect(registerTool).toHaveBeenCalledTimes(3);
      expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
        'list_media_assets',
        'get_media_asset',
        'list_media_folders',
      ]);
    });

    test('registers nothing when the MCP server is disabled', () => {
      const { strapi, registerTool } = makeStrapi({ isEnabled: false });

      registerUploadMcpTools({ strapi });

      expect(registerTool).not.toHaveBeenCalled();
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
      expect(byName.get_media_asset.description).toMatch(/numeric id/i);
      expect(byName.get_media_asset.description).toMatch(/not documents/i);
    });

    test('exposes an input schema for the tools that take arguments, and none for the folder tree', () => {
      expect(byName.list_media_assets.resolveInputSchema).toBeDefined();
      expect(byName.get_media_asset.resolveInputSchema).toBeDefined();
      expect(byName.list_media_folders.resolveInputSchema).toBeUndefined();
    });
  });
});
