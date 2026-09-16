import type { Core, Modules } from '@strapi/types';

import { assertAmbientInstance, getFolderService } from '../ambient-instance';
import {
  createMediaCreateFolderHandler,
  createMediaListFoldersHandler,
  createMediaMoveAssetsHandler,
  createMediaUpdateAssetHandler,
} from '../handlers';

/**
 * `assertAmbientInstance` exists to stop a handler from *looking* instance-bound while the
 * `folder` and `file` services silently query `global.strapi` — see the module for why they are
 * not converted to factories here. These tests pin both halves of that contract.
 *
 * `global.strapi` is deliberately not torn down between tests. `tests/setup/unit.setup.js`
 * installs it with `Object.defineProperty` and no `configurable: true`, so `delete global.strapi`
 * throws a TypeError under module strict mode, and assigning `undefined` trips the setter, which
 * immediately reads `strapi.plugins`. Jest isolates globals per test file, so the property does
 * not escape this one — every sibling MCP test file relies on the same thing.
 */
describe('ambient instance guard', () => {
  const folderService = { getStructure: jest.fn(), exists: jest.fn() };

  const context = {
    userAbility: {},
    user: { id: 1 },
  } as unknown as Modules.MCP.McpHandlerContext;

  const setGlobalStrapi = () => {
    const instance = {
      plugins: { upload: { services: { folder: folderService } } },
    };

    (global as unknown as { strapi: unknown }).strapi = instance;

    return (global as unknown as { strapi: Core.Strapi }).strapi;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assertAmbientInstance', () => {
    test('passes when handed the ambient instance', () => {
      const strapi = setGlobalStrapi();

      expect(() => assertAmbientInstance(strapi)).not.toThrow();
    });

    test('throws rather than querying the wrong app when handed a different instance', () => {
      setGlobalStrapi();

      // A second instance carrying its own services: the failure mode is that the resolved
      // services would still read the ambient app's media library, not this one's.
      const other = {
        plugin: () => ({ service: () => ({ getStructure: jest.fn() }) }),
      } as unknown as Core.Strapi;

      expect(() => assertAmbientInstance(other)).toThrow(/bound to the ambient/i);
    });
  });

  /**
   * The layer matters: `tool-registry` catches a factory throw at registration (Level 1) and
   * logs it, substituting a fallback handler — so the invariant reaches the operator's log
   * rather than an agent's tool output mid-call. A throw from inside the returned handler would
   * instead be wrapped as `Tool "<name>" execution failed: ...` and read by the agent.
   */
  describe('handler factories', () => {
    test('throw at construction, before the handler is returned', () => {
      setGlobalStrapi();

      const other = {} as unknown as Core.Strapi;

      expect(() => createMediaListFoldersHandler(other, context)).toThrow(/bound to the ambient/i);
      expect(() => createMediaUpdateAssetHandler(other, context)).toThrow(/bound to the ambient/i);
      expect(() => createMediaMoveAssetsHandler(other, context)).toThrow(/bound to the ambient/i);
      expect(() => createMediaCreateFolderHandler(other, context)).toThrow(/bound to the ambient/i);
    });
  });

  describe('getFolderService', () => {
    test('returns the folder service registered on the instance', () => {
      const strapi = setGlobalStrapi();

      expect(getFolderService(strapi)).toBe(folderService);
    });
  });
});
