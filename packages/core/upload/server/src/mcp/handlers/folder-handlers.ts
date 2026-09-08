import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { ACTIONS, FOLDER_MODEL_UID, FILE_MODEL_UID } from '../../constants';
import { isFolderOrChild } from '../../controllers/utils/folders';
import { assertMediaPermission } from '../permissions';
import { sanitizeMediaFolder } from '../sanitizers/sanitize-media';
import {
  MCP_NOT_FOUND_FOLDER,
  MCP_FOLDER_NAME_TAKEN,
  MCP_PARENT_FOLDER_NOT_FOUND,
  MCP_FOLDER_MOVE_INTO_SELF,
  MCP_DELETE_FOLDER_NO_MATCH,
} from './constants';
import { ok } from '../utils';

import type { Folder } from '../../types';

// Arg types are type-level only: the MCP SDK validates `args` against the tool's strict Zod
// input schema before the handler runs, so unknown keys never reach here.
type CreateFolderArgs = {
  name: string;
  parent?: number | null;
};

type RenameFolderArgs = {
  id: number;
  name: string;
};

type MoveFolderArgs = {
  id: number;
  parent: number | null;
};

type DeleteFolderArgs = {
  ids: number[];
  dryRun?: boolean;
};

/** The folder fields the handlers need; `path` drives the cascade and subtree checks. */
type FolderRow = Pick<Folder, 'id' | 'name' | 'path'>;

const findFolderById = async (strapi: Core.Strapi, id: number): Promise<FolderRow | null> =>
  strapi.db.query(FOLDER_MODEL_UID).findOne({
    select: ['id', 'name', 'path'],
    where: { id },
  });

/**
 * Re-reads a folder with its parent populated, so the write tools can echo back the same shape
 * regardless of what the service returned.
 *
 * `folder.update()` resolves the row it wrote without the `parent` relation, and on a pure rename
 * it never touches the join table at all — so the parent has to be read back to be reported.
 */
const readFolderForOutput = async (
  strapi: Core.Strapi,
  id: number,
  fallback: Record<string, unknown>
) => {
  const row = await strapi.db.query(FOLDER_MODEL_UID).findOne({
    where: { id },
    populate: { parent: { select: ['id', 'name'] } },
  });

  // The write succeeded, so report it even if the read-back comes back empty rather than
  // failing a completed operation on a follow-up query.
  return sanitizeMediaFolder(row ?? fallback);
};

/**
 * Replicates the admin folder controller's `parent` check: a named parent must exist.
 *
 * null is the media library root and always valid, so only a numeric id is looked up.
 */
const assertParentExists = async (strapi: Core.Strapi, parent: number | null | undefined) => {
  if (parent === null || parent === undefined) {
    return;
  }

  const exists = await getService('folder', strapi).exists({ id: parent });

  if (!exists) {
    throw new errors.ValidationError(MCP_PARENT_FOLDER_NOT_FOUND);
  }
};

/**
 * Replicates `is-folder-unique` from the admin folder validation: a folder name must be unique
 * among its siblings.
 *
 * `excludeId` is the folder being renamed — without it a rename to the folder's current name
 * would collide with itself.
 */
const assertNameAvailable = async (
  strapi: Core.Strapi,
  name: string,
  parent: number | null,
  excludeId?: number
) => {
  const filters: Record<string, unknown> = { name, parent: parent ?? null };

  if (excludeId !== undefined) {
    filters.id = { $ne: excludeId };
  }

  if (await getService('folder', strapi).exists(filters)) {
    throw new errors.ValidationError(MCP_FOLDER_NAME_TAKEN);
  }
};

/**
 * Replicates `dont-move-inside-self`: a folder cannot become its own descendant.
 *
 * Without this the folder service would rewrite the subtree's materialized paths into a cycle,
 * orphaning every descendant — the tree has no root to walk back to afterwards.
 */
const assertNotMovedIntoOwnSubtree = async (
  strapi: Core.Strapi,
  folder: FolderRow,
  parent: number | null
) => {
  if (parent === null) {
    return;
  }

  const destination = await findFolderById(strapi, parent);

  // A missing destination is already reported by `assertParentExists`.
  if (destination === null) {
    return;
  }

  if (isFolderOrChild(destination, folder)) {
    throw new errors.ValidationError(MCP_FOLDER_MOVE_INTO_SELF);
  }
};

/**
 * Counts the folders and files a `deleteByIds` of these paths would remove.
 *
 * Mirrors the two `$or` predicates in `folder.deleteByIds` exactly — self path plus the
 * `${path}/` prefix — so the dry-run number is the same set the destructive branch acts on
 * rather than an independent estimate that could drift from it.
 */
const countCascade = async (strapi: Core.Strapi, paths: string[]) => {
  const pathPredicate = (field: string) => ({
    $or: paths.flatMap((path) => [
      { [field]: { $eq: path } },
      { [field]: { $startsWith: `${path}/` } },
    ]),
  });

  const [totalFolderNumber, totalFileNumber] = await Promise.all([
    strapi.db.query(FOLDER_MODEL_UID).count({ where: pathPredicate('path') }),
    strapi.db.query(FILE_MODEL_UID).count({ where: pathPredicate('folderPath') }),
  ]);

  return { totalFolderNumber, totalFileNumber };
};

/**
 * `create_folder` — a new folder, optionally nested.
 *
 * Gated on `plugin::upload.assets.update` and mirrors `POST /upload/folders`: the same
 * uniqueness and parent-existence validation, the same `folder.create()` call, and the same
 * `createdBy` attribution from the session user.
 */
export const createCreateFolderHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { name, parent = null } = args as CreateFolderArgs;

    assertMediaPermission(strapi, context, ACTIONS.update, FOLDER_MODEL_UID);

    await assertParentExists(strapi, parent);
    await assertNameAvailable(strapi, name, parent);

    const created = await getService('folder', strapi).create(
      { name, parent },
      { user: context.user }
    );

    return ok({ data: await readFolderForOutput(strapi, created.id, created) });
  };

/**
 * `rename_folder` — changes a folder's name and nothing else.
 *
 * Deliberately does not forward `parent` to `folder.update()`: the service branches on
 * `isUndefined(parent)`, and the name-only branch skips the transaction that rewrites descendant
 * paths. Passing the folder's existing parent would take the move branch and rewrite the whole
 * subtree to compute the identical paths.
 */
export const createRenameFolderHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id, name } = args as RenameFolderArgs;

    assertMediaPermission(strapi, context, ACTIONS.update, FOLDER_MODEL_UID);

    const folder = await findFolderById(strapi, id);

    if (folder === null) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_FOLDER);
    }

    // Siblings are the folders sharing this folder's parent, so uniqueness is checked against
    // the current location — a rename never changes it.
    const current = await strapi.db.query(FOLDER_MODEL_UID).findOne({
      where: { id },
      populate: { parent: { select: ['id'] } },
    });
    const parentId = current?.parent?.id ?? null;

    await assertNameAvailable(strapi, name, parentId, id);

    // `parent` is omitted on purpose — see the note above.
    const renamed = await getService('folder', strapi).update(id, { name }, { user: context.user });

    return ok({ data: await readFolderForOutput(strapi, id, renamed ?? { ...folder, name }) });
  };

/**
 * `move_folder` — re-parents a folder, carrying its whole subtree with it.
 *
 * `folder.update()` recalculates the materialized `path` of every descendant folder and the
 * `folderPath` of every contained file inside a transaction, so the move is atomic and no
 * separate bookkeeping is needed here.
 */
export const createMoveFolderHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id, parent } = args as MoveFolderArgs;

    assertMediaPermission(strapi, context, ACTIONS.update, FOLDER_MODEL_UID);

    const folder = await findFolderById(strapi, id);

    if (folder === null) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_FOLDER);
    }

    await assertParentExists(strapi, parent);
    await assertNotMovedIntoOwnSubtree(strapi, folder, parent);

    // A folder keeps its name across a move, so uniqueness must hold in the destination.
    await assertNameAvailable(strapi, folder.name, parent, id);

    const moved = await getService('folder', strapi).update(
      id,
      { name: folder.name, parent },
      { user: context.user }
    );

    return ok({ data: await readFolderForOutput(strapi, id, moved ?? folder) });
  };

/**
 * `delete_folder` — previews or performs a cascading folder deletion.
 *
 * Two branches behind one tool, because the preview and the deletion must agree on what the
 * cascade covers; splitting them across tools would let the two drift apart, and an agent could
 * reach the destructive one without ever seeing a count.
 *
 * `dryRun` defaults to true (see the input schema): omitting the flag previews, and deleting
 * takes an explicit `dryRun: false`.
 */
export const createDeleteFolderHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { ids, dryRun = true } = args as DeleteFolderArgs;

    assertMediaPermission(strapi, context, ACTIONS.update, FOLDER_MODEL_UID);

    const matched: FolderRow[] = await strapi.db.query(FOLDER_MODEL_UID).findMany({
      select: ['id', 'name', 'path'],
      where: { id: { $in: ids } },
    });

    // Every id missing means the caller is almost certainly holding asset ids, which are
    // indistinguishable integers — worth an error rather than a zero-count success.
    if (matched.length === 0) {
      throw new errors.ValidationError(MCP_DELETE_FOLDER_NO_MATCH);
    }

    const matchedIds = new Set(matched.map((folder) => folder.id));
    const missingIds = ids.filter((id) => matchedIds.has(id) === false);
    const folders = matched.map((folder) => sanitizeMediaFolder(folder));

    if (dryRun) {
      const counts = await countCascade(
        strapi,
        matched.map((folder) => folder.path)
      );

      return ok({ dryRun: true, folders, ...counts, missingIds });
    }

    const { totalFolderNumber, totalFileNumber } = await getService('folder', strapi).deleteByIds(
      matched.map((folder) => folder.id)
    );

    return ok({
      dryRun: false,
      folders,
      totalFolderNumber,
      totalFileNumber,
      missingIds,
    });
  };
