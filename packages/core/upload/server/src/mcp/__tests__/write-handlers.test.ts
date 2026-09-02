import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { createUpdateMediaHandler } from '../handlers/write-handlers';
import { MCP_NOT_FOUND_ASSET, MCP_UPDATE_ASSET_NO_FIELDS } from '../handlers/constants';
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
  // `permissions.ts` and `getService()` both go through that global.
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

// The handler resolves services off the instance it is given, not the global, so the fake built
// by `setupStrapi()` is passed in explicitly. The global is still assigned there, because
// `findEntityAndCheckPermissions` is shared with the admin controllers and reads it.
const invoke = (args: Record<string, unknown>) =>
  createUpdateMediaHandler(
    (global as unknown as { strapi: Core.Strapi }).strapi,
    context
  )({ args });

describe('update_media handler', () => {
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

      // The error is the agent's only recovery hint, so it must point at move_media
      // rather than just restating that the patch was empty.
      await expect(invoke({ id: 1 })).rejects.toThrow(/move_media/);
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
