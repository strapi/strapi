import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import {
  createMediaCreateFolderHandler,
  createMediaRenameFolderHandler,
  createMediaMoveFolderHandler,
  createMediaDeleteFolderHandler,
} from '../handlers/folder-handlers';
import {
  MCP_NOT_FOUND_FOLDER,
  MCP_FOLDER_NAME_TAKEN,
  MCP_PARENT_FOLDER_NOT_FOUND,
  MCP_FOLDER_MOVE_INTO_SELF,
  MCP_DELETE_FOLDER_UNRESOLVED_IDS,
} from '../handlers/constants';
import { ACTIONS, FOLDER_MODEL_UID } from '../../constants';

const SESSION_USER = { id: 7 };

/**
 * A small in-memory folder tree used across the suite:
 *
 *   Root (1, /1)
 *     └── Child (2, /1/2)
 *   Other (3, /3)
 */
const FOLDERS: Record<number, { id: number; name: string; path: string; parent: number | null }> = {
  1: { id: 1, name: 'Root', path: '/1', parent: null },
  2: { id: 2, name: 'Child', path: '/1/2', parent: 1 },
  3: { id: 3, name: 'Other', path: '/3', parent: null },
};

type MockOptions = {
  /** Model-level grant: what `pm.isAllowed` reports. */
  isAllowed?: boolean;
  /**
   * Whether a *name* is already taken, driving the uniqueness check only.
   *
   * Parent-existence is answered from the FOLDERS tree instead, so the two rules that both go
   * through `folder.exists()` can be exercised independently.
   */
  nameTaken?: boolean | ((filters: Record<string, unknown>) => boolean);
  /** Rows `deleteByIds` reports as removed. */
  deleteCounts?: { totalFolderNumber: number; totalFileNumber: number };
  /** Counts returned by the dry-run `count()` calls, per model uid. */
  counts?: Record<string, number>;
};

const setupStrapi = (options: MockOptions = {}) => {
  const {
    isAllowed = true,
    nameTaken = false,
    deleteCounts = { totalFolderNumber: 2, totalFileNumber: 5 },
    counts = {},
  } = options;

  /**
   * `folder.exists()` serves two different checks, told apart by their filters: a parent lookup
   * passes `{ id }` alone, a uniqueness check always passes `name`.
   */
  const existsFn = jest.fn(async (filters: Record<string, unknown> = {}) => {
    if (filters.name === undefined) {
      return FOLDERS[filters.id as number] !== undefined;
    }

    return typeof nameTaken === 'function' ? nameTaken(filters) : nameTaken;
  });

  const create = jest.fn(async (data: Record<string, unknown>) => ({ id: 99, ...data }));
  // Two parameters so assertions can read the payload argument, which is what distinguishes
  // a rename (name only) from a move (name + parent).
  const update = jest.fn(
    async (id: number, data?: Record<string, unknown>) => FOLDERS[id] ?? { id, ...data }
  );
  const deleteByIds = jest.fn(async () => ({ folders: [], ...deleteCounts }));

  const findOne = jest.fn(async ({ where, populate }: Record<string, any>) => {
    const folder = FOLDERS[where.id as number];
    if (folder === undefined) return null;

    // The output read-back populates `parent`; the plain lookups do not.
    if (populate?.parent) {
      const parent = folder.parent === null ? null : FOLDERS[folder.parent];
      return { ...folder, parent };
    }

    return folder;
  });

  const findMany = jest.fn(async ({ where }: Record<string, any>) => {
    const ids = (where?.id?.$in ?? []) as number[];
    return ids.map((id) => FOLDERS[id]).filter(Boolean);
  });

  const count = jest.fn(async () => 0);

  const queryFor = (uid: string) => ({
    findOne,
    findMany,
    count: jest.fn(async () => counts[uid] ?? 0),
  });

  const query = jest.fn((uid: string) => queryFor(uid));

  const strapi = {
    plugins: {
      upload: {
        services: {
          folder: { create, update, deleteByIds, exists: existsFn },
        },
      },
    },
    admin: {
      services: {
        permission: {
          createPermissionsManager: jest.fn(() => ({
            isAllowed,
            action: ACTIONS.update,
            ability: { cannot: jest.fn(() => false) },
            toSubject: jest.fn((entity: unknown) => entity),
          })),
        },
      },
    },
    db: { query },
  };

  (global as unknown as { strapi: unknown }).strapi = strapi;

  return { create, update, deleteByIds, existsFn, query, count };
};

const context = { userAbility: {}, user: SESSION_USER } as unknown as Modules.MCP.McpHandlerContext;

const strapiInstance = () => (global as unknown as { strapi: Core.Strapi }).strapi;

const invokeCreate = (args: Record<string, unknown>) =>
  createMediaCreateFolderHandler(strapiInstance(), context)({ args });
const invokeRename = (args: Record<string, unknown>) =>
  createMediaRenameFolderHandler(strapiInstance(), context)({ args });
const invokeMove = (args: Record<string, unknown>) =>
  createMediaMoveFolderHandler(strapiInstance(), context)({ args });
const invokeDelete = (args: Record<string, unknown>) =>
  createMediaDeleteFolderHandler(strapiInstance(), context)({ args });

describe('folder MCP handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // media_create_folder
  // ---------------------------------------------------------------------------

  describe('media_create_folder', () => {
    test('creates a folder at the root when no parent is given, attributing the session user', async () => {
      const { create } = setupStrapi();

      const result = await invokeCreate({ name: 'New folder' });

      expect(create).toHaveBeenCalledWith(
        { name: 'New folder', parent: null },
        { user: SESSION_USER }
      );
      expect(result.structuredContent?.data).toBeDefined();
    });

    test('nests the folder under the given parent', async () => {
      const { create } = setupStrapi();

      await invokeCreate({ name: 'Nested', parent: 1 });

      expect(create).toHaveBeenCalledWith({ name: 'Nested', parent: 1 }, { user: SESSION_USER });
    });

    test('rejects a duplicate name within the same parent', async () => {
      const { create } = setupStrapi({ nameTaken: (filters) => filters.name === 'Taken' });

      await expect(invokeCreate({ name: 'Taken', parent: 1 })).rejects.toThrow(
        errors.ValidationError
      );
      await expect(invokeCreate({ name: 'Taken', parent: 1 })).rejects.toThrow(
        MCP_FOLDER_NAME_TAKEN
      );
      expect(create).not.toHaveBeenCalled();
    });

    test('checks uniqueness against the root when no parent is given', async () => {
      const { existsFn } = setupStrapi();

      await invokeCreate({ name: 'At root' });

      expect(existsFn).toHaveBeenCalledWith({ name: 'At root', parent: null });
    });

    test('rejects a parent that does not exist', async () => {
      const { create } = setupStrapi();

      await expect(invokeCreate({ name: 'Orphan', parent: 999 })).rejects.toThrow(
        MCP_PARENT_FOLDER_NOT_FOUND
      );
      expect(create).not.toHaveBeenCalled();
    });

    test('returns the folder without internal path bookkeeping', async () => {
      setupStrapi();

      const result = await invokeCreate({ name: 'Clean', parent: 1 });
      const data = result.structuredContent?.data as Record<string, unknown>;

      expect(data).not.toHaveProperty('path');
      expect(data).not.toHaveProperty('pathId');
    });

    test('denies the write without plugin::upload.assets.create', async () => {
      const { create } = setupStrapi({ isAllowed: false });

      await expect(invokeCreate({ name: 'Denied' })).rejects.toThrow(errors.ForbiddenError);
      expect(create).not.toHaveBeenCalled();
    });

    test('binds the permissions manager to the create action, matching POST /upload/folders', async () => {
      // Not `update`, unlike the other folder writes: the admin route for this same operation
      // requires `assets.create`, so a role with Update but not Create must be refused here too.
      setupStrapi();
      const { createPermissionsManager } = (
        global as unknown as {
          strapi: { admin: { services: { permission: { createPermissionsManager: jest.Mock } } } };
        }
      ).strapi.admin.services.permission;

      await invokeCreate({ name: 'New folder' });

      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: context.userAbility,
        action: ACTIONS.create,
        model: FOLDER_MODEL_UID,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // media_rename_folder
  // ---------------------------------------------------------------------------

  describe('media_rename_folder', () => {
    test('renames without forwarding a parent, so the subtree is not rewritten', async () => {
      const { update } = setupStrapi();

      await invokeRename({ id: 2, name: 'Renamed' });

      // Passing `parent` would take the service's move branch and rewrite every descendant
      // path to compute the identical value. The name-only payload skips that transaction.
      expect(update).toHaveBeenCalledWith(2, { name: 'Renamed' }, { user: SESSION_USER });
      expect(update.mock.calls[0][1]).not.toHaveProperty('parent');
    });

    test('checks uniqueness among siblings, excluding the folder itself', async () => {
      const { existsFn } = setupStrapi();

      await invokeRename({ id: 2, name: 'Renamed' });

      // Folder 2 sits under folder 1, and must not collide with its own current row.
      expect(existsFn).toHaveBeenCalledWith({
        name: 'Renamed',
        parent: 1,
        id: { $ne: 2 },
      });
    });

    test('rejects a duplicate name within the same parent', async () => {
      const { update } = setupStrapi({ nameTaken: true });

      await expect(invokeRename({ id: 2, name: 'Child' })).rejects.toThrow(MCP_FOLDER_NAME_TAKEN);
      expect(update).not.toHaveBeenCalled();
    });

    test('throws NotFound for an unknown folder', async () => {
      const { update } = setupStrapi();

      await expect(invokeRename({ id: 999, name: 'Ghost' })).rejects.toThrow(errors.NotFoundError);
      await expect(invokeRename({ id: 999, name: 'Ghost' })).rejects.toThrow(MCP_NOT_FOUND_FOLDER);
      expect(update).not.toHaveBeenCalled();
    });

    test('denies the write without plugin::upload.assets.update', async () => {
      const { update } = setupStrapi({ isAllowed: false });

      await expect(invokeRename({ id: 2, name: 'Denied' })).rejects.toThrow(errors.ForbiddenError);
      expect(update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // media_move_folder
  // ---------------------------------------------------------------------------

  describe('media_move_folder', () => {
    test('re-parents the folder, keeping its name', async () => {
      const { update } = setupStrapi();

      await invokeMove({ id: 2, parent: 3 });

      expect(update).toHaveBeenCalledWith(2, { name: 'Child', parent: 3 }, { user: SESSION_USER });
    });

    test('moves a folder to the root with parent: null', async () => {
      const { update } = setupStrapi();

      await invokeMove({ id: 2, parent: null });

      expect(update).toHaveBeenCalledWith(
        2,
        { name: 'Child', parent: null },
        { user: SESSION_USER }
      );
    });

    test('rejects moving a folder into itself', async () => {
      const { update } = setupStrapi();

      await expect(invokeMove({ id: 1, parent: 1 })).rejects.toThrow(MCP_FOLDER_MOVE_INTO_SELF);
      expect(update).not.toHaveBeenCalled();
    });

    test('rejects moving a folder into its own descendant', async () => {
      const { update } = setupStrapi();

      // Folder 2 (/1/2) is a child of folder 1 (/1): moving 1 into 2 would make the tree
      // cyclic and orphan the whole subtree.
      await expect(invokeMove({ id: 1, parent: 2 })).rejects.toThrow(MCP_FOLDER_MOVE_INTO_SELF);
      expect(update).not.toHaveBeenCalled();
    });

    test('allows a move between unrelated branches', async () => {
      const { update } = setupStrapi();

      await invokeMove({ id: 3, parent: 1 });

      expect(update).toHaveBeenCalled();
    });

    test('rejects a destination that does not exist', async () => {
      const { update } = setupStrapi();

      await expect(invokeMove({ id: 2, parent: 999 })).rejects.toThrow(MCP_PARENT_FOLDER_NOT_FOUND);
      expect(update).not.toHaveBeenCalled();
    });

    test('rejects a move that would collide with a name in the destination', async () => {
      const { update } = setupStrapi({ nameTaken: true });

      await expect(invokeMove({ id: 2, parent: 3 })).rejects.toThrow(MCP_FOLDER_NAME_TAKEN);
      expect(update).not.toHaveBeenCalled();
    });

    test('throws NotFound for an unknown folder', async () => {
      const { update } = setupStrapi();

      await expect(invokeMove({ id: 999, parent: 1 })).rejects.toThrow(MCP_NOT_FOUND_FOLDER);
      expect(update).not.toHaveBeenCalled();
    });

    test('denies the write without plugin::upload.assets.update', async () => {
      const { update } = setupStrapi({ isAllowed: false });

      await expect(invokeMove({ id: 2, parent: 3 })).rejects.toThrow(errors.ForbiddenError);
      expect(update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // media_delete_folder
  // ---------------------------------------------------------------------------

  describe('media_delete_folder', () => {
    test('previews by default, without deleting anything', async () => {
      const { deleteByIds } = setupStrapi({
        counts: { [FOLDER_MODEL_UID]: 3, 'plugin::upload.file': 7 },
      });

      const result = await invokeDelete({ ids: [1] });

      // The safe branch is the one an agent reaches by omitting the flag.
      expect(deleteByIds).not.toHaveBeenCalled();
      expect(result.structuredContent).toMatchObject({
        dryRun: true,
        totalFolderNumber: 3,
        totalFileNumber: 7,
      });
    });

    test('previews when dryRun is explicitly true', async () => {
      const { deleteByIds } = setupStrapi();

      const result = await invokeDelete({ ids: [1], dryRun: true });

      expect(deleteByIds).not.toHaveBeenCalled();
      expect(result.structuredContent?.dryRun).toBe(true);
    });

    test('counts the cascade over the folder subtree and its files', async () => {
      const { query } = setupStrapi({
        counts: { [FOLDER_MODEL_UID]: 2, 'plugin::upload.file': 4 },
      });

      const result = await invokeDelete({ ids: [1] });

      // Both models are counted with the same path predicates the destructive branch uses.
      expect(query).toHaveBeenCalledWith(FOLDER_MODEL_UID);
      expect(query).toHaveBeenCalledWith('plugin::upload.file');
      expect(result.structuredContent).toMatchObject({
        totalFolderNumber: 2,
        totalFileNumber: 4,
      });
    });

    test('deletes only when dryRun is explicitly false, returning the real counts', async () => {
      const { deleteByIds } = setupStrapi({
        deleteCounts: { totalFolderNumber: 2, totalFileNumber: 5 },
      });

      const result = await invokeDelete({ ids: [1], dryRun: false });

      expect(deleteByIds).toHaveBeenCalledWith([1]);
      expect(result.structuredContent).toMatchObject({
        dryRun: false,
        totalFolderNumber: 2,
        totalFileNumber: 5,
      });
    });

    test('rejects the whole call when one id among valid ones does not resolve', async () => {
      const { deleteByIds } = setupStrapi();

      // The dangerous case: a mixed list must not delete the folders that did match. Folder
      // and asset ids are indistinguishable integers, so this is the confusion the tool exists
      // to catch — and a partial delete would report it only after the cascade was gone.
      await expect(invokeDelete({ ids: [1, 4242], dryRun: false })).rejects.toThrow(
        errors.ValidationError
      );
      expect(deleteByIds).not.toHaveBeenCalled();
    });

    test('names the offending ids, so the agent knows which entries to correct', async () => {
      setupStrapi();

      await expect(invokeDelete({ ids: [1, 4242], dryRun: false })).rejects.toThrow(/4242/);
      // ...without blaming the ids that were fine.
      await expect(invokeDelete({ ids: [1, 4242], dryRun: false })).rejects.not.toThrow(
        /folder: 1,|ids: 1,/
      );
    });

    test('points an unresolved id at media_delete_assets without asserting it is one', async () => {
      setupStrapi();

      // An asset id is the likeliest cause, but a deleted folder id is indistinguishable from
      // here — the message must offer both rather than mis-diagnose.
      await expect(invokeDelete({ ids: [4242], dryRun: false })).rejects.toThrow(
        /media_delete_assets/
      );
      await expect(invokeDelete({ ids: [4242], dryRun: false })).rejects.toThrow(/already be gone/);
    });

    test('rejects on the same rule during a dry run, before any counting', async () => {
      const { deleteByIds } = setupStrapi();

      // A preview that reported a cascade for a request the executing call would refuse is a
      // confirmation the agent cannot act on.
      await expect(invokeDelete({ ids: [1, 4242] })).rejects.toThrow(errors.ValidationError);
      await expect(invokeDelete({ ids: [1, 4242], dryRun: true })).rejects.toThrow(
        errors.ValidationError
      );
      expect(deleteByIds).not.toHaveBeenCalled();
    });

    test('rejects a call whose ids match no folder at all', async () => {
      const { deleteByIds } = setupStrapi();

      await expect(invokeDelete({ ids: [4242], dryRun: false })).rejects.toThrow(
        MCP_DELETE_FOLDER_UNRESOLVED_IDS([4242])
      );
      expect(deleteByIds).not.toHaveBeenCalled();
    });

    test('reports no skipped-ids field, since every id is accounted for on success', async () => {
      setupStrapi();

      const result = await invokeDelete({ ids: [1], dryRun: false });

      expect(result.structuredContent).not.toHaveProperty('missingIds');
    });

    test('returns the matched folders sanitized, without path bookkeeping', async () => {
      setupStrapi();

      const result = await invokeDelete({ ids: [1] });
      const folders = result.structuredContent?.folders as Record<string, unknown>[];

      expect(folders).toHaveLength(1);
      expect(folders[0]).toMatchObject({ id: 1, name: 'Root' });
      expect(folders[0]).not.toHaveProperty('path');
      expect(folders[0]).not.toHaveProperty('pathId');
    });

    test('denies the delete without plugin::upload.assets.update, even as a dry run', async () => {
      const { deleteByIds } = setupStrapi({ isAllowed: false });

      await expect(invokeDelete({ ids: [1] })).rejects.toThrow(errors.ForbiddenError);
      await expect(invokeDelete({ ids: [1], dryRun: false })).rejects.toThrow(
        errors.ForbiddenError
      );
      expect(deleteByIds).not.toHaveBeenCalled();
    });

    test('binds the permissions manager to the update action on the folder model', async () => {
      setupStrapi();
      const { createPermissionsManager } = (
        global as unknown as {
          strapi: { admin: { services: { permission: { createPermissionsManager: jest.Mock } } } };
        }
      ).strapi.admin.services.permission;

      await invokeDelete({ ids: [1] });

      expect(createPermissionsManager).toHaveBeenCalledWith({
        ability: context.userAbility,
        action: ACTIONS.update,
        model: FOLDER_MODEL_UID,
      });
    });
  });
});
