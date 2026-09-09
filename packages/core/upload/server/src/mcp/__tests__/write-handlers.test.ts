import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import {
  createMediaUpdateAssetHandler,
  createMediaMoveAssetsHandler,
} from '../handlers/write-handlers';
import {
  MCP_NOT_FOUND_ASSET,
  MCP_UPDATE_ASSET_NO_FIELDS,
  MCP_MOVE_ASSETS_DESTINATION_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_FORBIDDEN,
  MCP_MOVE_ASSETS_ID_FAILED,
} from '../handlers/constants';
import { ACTIONS, FILE_MODEL_UID } from '../../constants';

type MockOptions = {
  /** Model-level grant: what `pm.isAllowed` reports. */
  isAllowed?: boolean;
  /** Row-level grant: what a permission *condition* reports for this asset. */
  canOnEntity?: boolean;
  /** The stored row `upload.findOne()` resolves to; null for a missing asset. */
  asset?: Record<string, unknown> | null;
};

const SESSION_USER = { id: 7 };

const STORED_ASSET = {
  id: 1,
  name: 'photo.jpg',
  alternativeText: 'old alt',
  caption: 'old caption',
  url: '/uploads/photo.jpg',
  mime: 'image/jpeg',
  size: 12.5,
  provider: 'local',
  provider_metadata: { secretKey: 'super-secret' },
  hash: 'photo_abc123',
  folderPath: '/1',
  folder: { id: 2, name: 'Photos' },
};

const setupStrapi = (options: MockOptions = {}) => {
  const { isAllowed = true, canOnEntity = true, asset = STORED_ASSET } = options;

  const findOne = jest.fn().mockResolvedValue(asset);
  const updateFileInfo = jest
    .fn()
    .mockImplementation(async (id: number, fileInfo: Record<string, unknown>) => ({
      ...STORED_ASSET,
      ...fileInfo,
      id,
    }));

  const createPermissionsManager = jest.fn(() => ({
    isAllowed,
    action: ACTIONS.update,
    ability: { cannot: jest.fn(() => canOnEntity === false) },
    toSubject: jest.fn((entity: unknown) => entity),
  }));

  const adminUserFindOne = jest.fn().mockResolvedValue({ id: 9, roles: [{ id: 1 }] });

  // Shaped for `tests/setup/unit.setup.js`, whose global `strapi` setter derives
  // `strapi.plugin()` from `plugins` and `strapi.service('admin::x')` from `admin.services`.
  const strapi = {
    plugins: {
      upload: { services: { upload: { findOne, updateFileInfo } } },
    },
    admin: {
      services: {
        permission: { createPermissionsManager },
        user: { findOne: adminUserFindOne },
      },
    },
  };

  (global as unknown as { strapi: unknown }).strapi = strapi;

  return { strapi, findOne, updateFileInfo, createPermissionsManager, adminUserFindOne };
};

const context = { userAbility: {}, user: SESSION_USER } as unknown as Modules.MCP.McpHandlerContext;

// Pass the fully shaped instance produced by the unit-test setter to the handler explicitly.
const invoke = (args: Record<string, unknown>) =>
  createMediaUpdateAssetHandler(
    (global as unknown as { strapi: Core.Strapi }).strapi,
    context
  )({ args });

describe('media_update_asset handler', () => {
  afterEach(() => {
    // `tests/setup/unit.setup.js` defines the global `strapi` as an accessor, so it is
    // reassigned per test rather than deleted.
    jest.clearAllMocks();
  });

  describe('metadata update', () => {
    test('writes the writable fields through updateFileInfo and attributes the session user', async () => {
      const { updateFileInfo } = setupStrapi();

      const result = await invoke({
        id: 1,
        name: 'renamed.jpg',
        alternativeText: 'new alt',
        caption: 'new caption',
      });

      expect(updateFileInfo).toHaveBeenCalledWith(
        1,
        { name: 'renamed.jpg', alternativeText: 'new alt', caption: 'new caption' },
        { user: SESSION_USER }
      );

      expect(result.structuredContent).toEqual({
        data: expect.objectContaining({
          id: 1,
          name: 'renamed.jpg',
          alternativeText: 'new alt',
          caption: 'new caption',
        }),
      });
    });

    test('forwards only the fields the caller sent, leaving the others untouched', async () => {
      const { updateFileInfo } = setupStrapi();

      await invoke({ id: 1, caption: 'just the caption' });

      // Omitted keys must not be forwarded: `updateFileInfo` reads nil as "keep the stored
      // value", so sending them as undefined would be equivalent but noisier — and sending
      // them as null would wrongly read as unchanged rather than cleared.
      expect(updateFileInfo).toHaveBeenCalledWith(
        1,
        { caption: 'just the caption' },
        { user: SESSION_USER }
      );
    });

    test('clears a field passed as null by writing an empty string', async () => {
      const { updateFileInfo } = setupStrapi();

      await invoke({ id: 1, alternativeText: null, caption: null });

      // `updateFileInfo` treats nil as "keep the stored value" (`_.isNil`), so a literal null
      // would be a silent no-op. Empty string is what the admin panel writes when a user
      // empties the field.
      expect(updateFileInfo).toHaveBeenCalledWith(
        1,
        { alternativeText: '', caption: '' },
        { user: SESSION_USER }
      );
    });

    test('returns the asset through the read sanitizer, without provider fields', async () => {
      setupStrapi();

      const result = await invoke({ id: 1, name: 'renamed.jpg' });
      const data = result.structuredContent?.data as Record<string, unknown>;

      for (const field of ['provider', 'provider_metadata', 'hash', 'folderPath', 'formats']) {
        expect(data).not.toHaveProperty(field);
      }

      expect(data).toMatchObject({ folder: { id: 2, name: 'Photos' } });
    });
  });

  describe('out-of-scope fields', () => {
    test('rejects a patch that carries no writable field', async () => {
      setupStrapi();

      await expect(invoke({ id: 1 })).rejects.toThrow(errors.ValidationError);
      await expect(invoke({ id: 1 })).rejects.toThrow(MCP_UPDATE_ASSET_NO_FIELDS);
    });

    test('names the right tool when the caller sends nothing writable', async () => {
      setupStrapi();

      // The error is the agent's only recovery hint, so it must point at media_move_assets
      // rather than just restating that the patch was empty.
      await expect(invoke({ id: 1 })).rejects.toThrow(/media_move_assets/);
    });

    test('never forwards a field outside the allowlist to the upload service', async () => {
      const { updateFileInfo } = setupStrapi();

      // Defence in depth: the strict Zod schema rejects these before the handler runs, but the
      // handler must not forward them if it is ever called from another entry point.
      await invoke({
        id: 1,
        name: 'renamed.jpg',
        folder: 5,
        url: '/uploads/evil.jpg',
        provider: 'aws-s3',
        provider_metadata: { secretKey: 'leak' },
        hash: 'forced',
        mime: 'text/html',
        focalPoint: { x: 10, y: 10 },
      } as Record<string, unknown>);

      expect(updateFileInfo).toHaveBeenCalledWith(
        1,
        { name: 'renamed.jpg' },
        { user: SESSION_USER }
      );
    });
  });

  describe('permissions', () => {
    test('binds the permissions manager to the update action on the file model', async () => {
      const { createPermissionsManager } = setupStrapi();

      await invoke({ id: 1, name: 'renamed.jpg' });

      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: context.userAbility,
        action: ACTIONS.update,
        model: FILE_MODEL_UID,
      });
    });

    test('denies the write without plugin::upload.assets.update', async () => {
      const { updateFileInfo } = setupStrapi({ isAllowed: false });

      await expect(invoke({ id: 1, name: 'renamed.jpg' })).rejects.toThrow(errors.ForbiddenError);
      expect(updateFileInfo).not.toHaveBeenCalled();
    });

    test('denies the write when a permission condition excludes this asset', async () => {
      const { updateFileInfo } = setupStrapi({ canOnEntity: false });

      await expect(invoke({ id: 1, name: 'renamed.jpg' })).rejects.toThrow(errors.ForbiddenError);
      expect(updateFileInfo).not.toHaveBeenCalled();
    });

    test('resolves the creator with roles so owner conditions can be evaluated', async () => {
      const { adminUserFindOne, findOne } = setupStrapi({
        asset: { ...STORED_ASSET, createdBy: { id: 9 } },
      });

      await invoke({ id: 1, name: 'renamed.jpg' });

      expect(findOne).toHaveBeenCalledWith(1, ['createdBy', 'folder']);
      expect(adminUserFindOne).toHaveBeenCalledWith(9, ['roles']);
    });

    test('does not look up a creator for an asset that has none', async () => {
      const { adminUserFindOne } = setupStrapi();

      await invoke({ id: 1, name: 'renamed.jpg' });

      expect(adminUserFindOne).not.toHaveBeenCalled();
    });
  });

  describe('missing asset', () => {
    test('throws NotFound for an unknown id', async () => {
      const { updateFileInfo } = setupStrapi({ asset: null });

      await expect(invoke({ id: 999, name: 'renamed.jpg' })).rejects.toThrow(errors.NotFoundError);
      await expect(invoke({ id: 999, name: 'renamed.jpg' })).rejects.toThrow(MCP_NOT_FOUND_ASSET);
      expect(updateFileInfo).not.toHaveBeenCalled();
    });
  });
});

/**
 * `media_move_assets` has its own setup: it needs `strapi.db.query` for the destination-folder lookup,
 * and drives `findOne` per id so a mixed request (a valid asset, a missing one, a forbidden one)
 * can be exercised in a single call — which is the behaviour the per-id report exists for.
 */
describe('media_move_assets handler', () => {
  const FOLDERS: Record<number, { id: number; name: string }> = {
    2: { id: 2, name: 'Photos' },
    3: { id: 3, name: 'Archive' },
  };

  /** Assets keyed by id. 1 and 4 exist; 55 is forbidden by a condition; anything else is missing. */
  const ASSETS: Record<number, Record<string, unknown>> = {
    1: { ...STORED_ASSET, id: 1, name: 'one.jpg' },
    4: { ...STORED_ASSET, id: 4, name: 'four.jpg' },
    55: { ...STORED_ASSET, id: 55, name: 'forbidden.jpg' },
  };

  /** Ids a permission *condition* excludes, so `pm.ability.cannot` reports true for them. */
  const FORBIDDEN_IDS = new Set([55]);

  const setupMoveStrapi = (options: { isAllowed?: boolean } = {}) => {
    const { isAllowed = true } = options;

    const findOne = jest.fn(async (id: number) => ASSETS[id] ?? null);

    const updateFileInfo = jest.fn(
      async (id: number, fileInfo: Record<string, unknown>) =>
        ({ ...ASSETS[id], ...fileInfo }) as Record<string, unknown>
    );

    const folderFindOne = jest.fn(async ({ where }: Record<string, any>) => {
      return FOLDERS[where.id as number] ?? null;
    });

    const createPermissionsManager = jest.fn(() => ({
      isAllowed,
      action: ACTIONS.update,
      // `findEntityAndCheckPermissions` hands the file row to `toSubject`, so the condition is
      // decided from the asset's own id.
      ability: {
        cannot: jest.fn((_action: unknown, subject: Record<string, unknown>) =>
          FORBIDDEN_IDS.has(Number(subject?.id))
        ),
      },
      toSubject: jest.fn((entity: unknown) => entity),
    }));

    const strapi = {
      plugins: { upload: { services: { upload: { findOne, updateFileInfo } } } },
      admin: {
        services: {
          permission: { createPermissionsManager },
          user: { findOne: jest.fn().mockResolvedValue({ id: 9, roles: [{ id: 1 }] }) },
        },
      },
      db: { query: jest.fn(() => ({ findOne: folderFindOne })) },
    };

    (global as unknown as { strapi: unknown }).strapi = strapi;

    return { findOne, updateFileInfo, folderFindOne, createPermissionsManager };
  };

  const move = (args: Record<string, unknown>) =>
    createMediaMoveAssetsHandler(
      (global as unknown as { strapi: Core.Strapi }).strapi,
      context
    )({ args });

  const structured = (result: Modules.MCP.McpToolHandlerReturn) =>
    result.structuredContent as {
      destinationFolder: Record<string, unknown> | null;
      moved: Record<string, unknown>[];
      failed: { id: number; reason: string }[];
    };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    test('moves every asset into the destination folder and attributes the session user', async () => {
      const { updateFileInfo } = setupMoveStrapi();

      const result = await move({ ids: [1, 4], folder: 3 });
      const { destinationFolder, moved, failed } = structured(result);

      expect(updateFileInfo).toHaveBeenNthCalledWith(1, 1, { folder: 3 }, { user: SESSION_USER });
      expect(updateFileInfo).toHaveBeenNthCalledWith(2, 4, { folder: 3 }, { user: SESSION_USER });

      expect(destinationFolder).toEqual({ id: 3, name: 'Archive' });
      expect(moved.map((asset) => asset.id)).toEqual([1, 4]);
      expect(failed).toEqual([]);
    });

    test('reports the new folder on each moved asset, without a follow-up read', async () => {
      setupMoveStrapi();

      const { moved } = structured(await move({ ids: [1], folder: 3 }));

      // `updateFileInfo` resolves the row without the relation populated, so the handler has to
      // attach the destination itself — otherwise the response would report the stale folder.
      expect(moved[0]).toMatchObject({ id: 1, folder: { id: 3, name: 'Archive' } });
    });

    test('moves assets to the media library root on folder: null', async () => {
      const { updateFileInfo, folderFindOne } = setupMoveStrapi();

      const { destinationFolder, moved } = structured(await move({ ids: [1], folder: null }));

      // null is the root and always valid: no folder lookup is needed to prove it exists.
      expect(folderFindOne).not.toHaveBeenCalled();
      expect(updateFileInfo).toHaveBeenCalledWith(1, { folder: null }, { user: SESSION_USER });
      expect(destinationFolder).toBeNull();
      expect(moved[0]).toMatchObject({ id: 1, folder: null });
    });

    test('moves a single asset through the same bulk contract', async () => {
      setupMoveStrapi();

      // There is no single-asset tool: an array of one is the whole difference.
      const { moved, failed } = structured(await move({ ids: [1], folder: 2 }));

      expect(moved.map((asset) => asset.id)).toEqual([1]);
      expect(failed).toEqual([]);
    });

    test('moves a repeated id once and reports it once', async () => {
      const { updateFileInfo } = setupMoveStrapi();

      const { moved } = structured(await move({ ids: [1, 1, 4], folder: 3 }));

      expect(updateFileInfo).toHaveBeenCalledTimes(2);
      expect(moved.map((asset) => asset.id)).toEqual([1, 4]);
    });

    test('returns assets through the read sanitizer, without provider fields', async () => {
      setupMoveStrapi();

      const { moved } = structured(await move({ ids: [1], folder: 3 }));

      for (const field of ['provider', 'provider_metadata', 'hash', 'folderPath', 'formats']) {
        expect(moved[0]).not.toHaveProperty(field);
      }
    });
  });

  describe('destination folder', () => {
    test('rejects the whole call when the destination does not exist, moving nothing', async () => {
      const { updateFileInfo } = setupMoveStrapi();

      await expect(move({ ids: [1, 4], folder: 999 })).rejects.toThrow(errors.ValidationError);
      await expect(move({ ids: [1, 4], folder: 999 })).rejects.toThrow(
        MCP_MOVE_ASSETS_DESTINATION_NOT_FOUND
      );

      // A bad destination is a property of the request, not of any id: it must be refused before
      // a single asset is touched, rather than reported per id.
      expect(updateFileInfo).not.toHaveBeenCalled();
    });

    test('validates the destination before moving anything, not per asset', async () => {
      const { folderFindOne } = setupMoveStrapi();

      await move({ ids: [1, 4], folder: 3 });

      expect(folderFindOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('partial failure', () => {
    test('applies the valid moves and reports the bad id, without rolling back', async () => {
      const { updateFileInfo } = setupMoveStrapi();

      const { moved, failed } = structured(await move({ ids: [1, 999, 4], folder: 3 }));

      // The requirement this tool exists for: a bad id among good ones must not discard the
      // moves that succeeded.
      expect(updateFileInfo).toHaveBeenCalledTimes(2);
      expect(moved.map((asset) => asset.id)).toEqual([1, 4]);
      expect(failed).toEqual([{ id: 999, reason: MCP_MOVE_ASSETS_ID_NOT_FOUND }]);
    });

    test('names media_move_folder in the reason, since a folder id is the likeliest bad id', async () => {
      setupMoveStrapi();

      const { failed } = structured(await move({ ids: [1, 999], folder: 3 }));

      expect(failed[0].reason).toMatch(/media_move_folder/);
    });

    test('reports an asset a permission condition excludes, and moves the rest', async () => {
      const { updateFileInfo } = setupMoveStrapi();

      const { moved, failed } = structured(await move({ ids: [1, 55], folder: 3 }));

      expect(moved.map((asset) => asset.id)).toEqual([1]);
      expect(failed).toEqual([{ id: 55, reason: MCP_MOVE_ASSETS_ID_FORBIDDEN }]);
      expect(updateFileInfo).not.toHaveBeenCalledWith(55, expect.anything(), expect.anything());
    });

    test('accounts for every requested id across moved and failed', async () => {
      setupMoveStrapi();

      const { moved, failed } = structured(await move({ ids: [1, 55, 999, 4], folder: 3 }));

      expect([...moved.map((asset) => asset.id), ...failed.map(({ id }) => id)].sort()).toEqual([
        1, 4, 55, 999,
      ]);
    });

    test('still returns the per-id report when nothing moved at all', async () => {
      setupMoveStrapi();

      // `moved: []` with every id in `failed` is not ambiguous — it says plainly that nothing
      // moved and why. Throwing would drop `structuredContent` entirely, so a single bad id
      // would get prose where `[1, 999]` gets a machine-readable entry, for the same mistake.
      const { moved, failed } = structured(await move({ ids: [999, 998], folder: 3 }));

      expect(moved).toEqual([]);
      expect(failed.map(({ id }) => id)).toEqual([999, 998]);
      expect(failed[0].reason).toBe(MCP_MOVE_ASSETS_ID_NOT_FOUND);
    });

    test('reports a write failure against its own id, keeping the earlier moves in the report', async () => {
      const { updateFileInfo } = setupMoveStrapi();
      // Asset 1 moves; asset 4's write then fails.
      updateFileInfo.mockImplementationOnce(
        async (id: number, fileInfo: Record<string, unknown>) => ({
          ...ASSETS[id],
          ...fileInfo,
        })
      );
      updateFileInfo.mockImplementationOnce(async () => {
        throw new Error('connection lost');
      });

      const { moved, failed } = structured(await move({ ids: [1, 4], folder: 3 }));

      // The regression this guards: throwing here would reach the client as a tool error with
      // no `structuredContent`, discarding the fact that asset 1 had already moved — the agent
      // could not tell which ids to retry.
      expect(moved.map((asset) => asset.id)).toEqual([1]);
      expect(failed).toEqual([{ id: 4, reason: MCP_MOVE_ASSETS_ID_FAILED('connection lost') }]);
    });

    test('carries the underlying message through, so the real fault stays legible', async () => {
      const { updateFileInfo } = setupMoveStrapi();
      updateFileInfo.mockImplementationOnce(async () => {
        throw new Error('provider unreachable');
      });

      const { failed } = structured(await move({ ids: [1], folder: 3 }));

      expect(failed[0].reason).toMatch(/provider unreachable/);
      // ...and says the id itself is fine, so the agent does not treat it as a bad id.
      expect(failed[0].reason).toMatch(/not a problem with the id itself/);
    });

    test('does not strand the rest of a reorganisation after one broken asset', async () => {
      const { updateFileInfo } = setupMoveStrapi();
      updateFileInfo.mockImplementationOnce(async () => {
        throw new Error('transient');
      });

      const { moved, failed } = structured(await move({ ids: [1, 4], folder: 3 }));

      // Asset 1 failed, but the loop continued and moved asset 4.
      expect(moved.map((asset) => asset.id)).toEqual([4]);
      expect(failed.map(({ id }) => id)).toEqual([1]);
    });
  });

  describe('permissions', () => {
    test('binds the permissions manager to the update action on the file model', async () => {
      const { createPermissionsManager } = setupMoveStrapi();

      await move({ ids: [1], folder: 3 });

      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: context.userAbility,
        action: ACTIONS.update,
        model: FILE_MODEL_UID,
      });
    });

    test('denies the move without plugin::upload.assets.update, before any DB read', async () => {
      const { updateFileInfo, folderFindOne } = setupMoveStrapi({ isAllowed: false });

      await expect(move({ ids: [1], folder: 3 })).rejects.toThrow(errors.ForbiddenError);
      expect(folderFindOne).not.toHaveBeenCalled();
      expect(updateFileInfo).not.toHaveBeenCalled();
    });
  });
});
