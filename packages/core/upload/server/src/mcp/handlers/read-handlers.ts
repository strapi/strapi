import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { ACTIONS, FILE_MODEL_UID, FOLDER_MODEL_UID } from '../../constants';
import { assertMediaPermission } from '../permissions';
import { sanitizeMediaAsset, sanitizeMediaFolderTree } from '../sanitizers/sanitize-media';
import { MCP_NOT_FOUND_ASSET } from './constants';
import { ok } from '../utils';

const DEFAULT_SORT = 'createdAt:DESC';

// Arg types are type-level only: the MCP SDK validates `args` against the tool's Zod input
// schema before the handler runs, so handlers accept the erased `Record<string, unknown>` the
// registry hands them and narrow it here.
type ListMediaArgs = {
  folderId?: number | null;
  mime?: string;
  name?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
};

type GetMediaArgs = {
  id: number;
};

/**
 * Builds the `filters` clause for `list_media`.
 *
 * `folderId: null` is meaningfully different from an omitted `folderId`: null means "assets at
 * the media library root" (no folder relation), while omitting it means "any folder".
 *
 * `mime` accepts both a full type and a bare prefix. An exact match on "image" would never hit,
 * so a value without a slash is matched as a prefix ("image" → every "image/*").
 */
const buildAssetFilters = (args: ListMediaArgs): Record<string, unknown> => {
  const filters: Record<string, unknown> = {};

  if (args.folderId === null) {
    filters.folder = null;
  } else if (args.folderId !== undefined) {
    filters.folder = { id: args.folderId };
  }

  if (args.mime !== undefined) {
    filters.mime = args.mime.includes('/')
      ? { $eqi: args.mime }
      : { $startsWithi: `${args.mime}/` };
  }

  if (args.name !== undefined) {
    filters.name = { $containsi: args.name };
  }

  return filters;
};

/**
 * `list_media` — paginated, filtered listing of media files.
 *
 * Permission conditions are applied through the permissions manager
 * (`addPermissionsQueryTo`) so a token restricted by a condition — e.g. own-assets-only —
 * sees the same subset it would through the admin API.
 */
export const createListMediaHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { folderId, mime, name, page, pageSize, sort } = args as ListMediaArgs;
    const pm = assertMediaPermission(strapi, context, ACTIONS.read, FILE_MODEL_UID);

    const query = await pm.addPermissionsQueryTo({
      filters: buildAssetFilters({ folderId, mime, name }),
      sort: sort ?? DEFAULT_SORT,
      page: page ?? 1,
      pageSize: pageSize ?? 25,
      populate: { folder: { fields: ['id', 'name'] } },
    });

    const { results, pagination } = await getService('upload', strapi).findPage(query);

    return ok({
      results: results.map(sanitizeMediaAsset),
      pagination,
    });
  };

/**
 * `get_media` — a single asset by numeric id.
 *
 * The entity-level `cannot(action, subject)` check is what enforces permission *conditions*:
 * `pm.isAllowed` only proves the action is permitted on the model, not on this row.
 */
export const createGetMediaHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id } = args as GetMediaArgs;
    const pm = assertMediaPermission(strapi, context, ACTIONS.read, FILE_MODEL_UID);

    const asset = await getService('upload', strapi).findOne(id, {
      folder: { fields: ['id', 'name'] },
    });

    if (asset === null || asset === undefined) {
      throw new errors.NotFoundError(MCP_NOT_FOUND_ASSET);
    }

    if (pm.ability.cannot(pm.action, pm.toSubject(asset))) {
      throw new errors.ForbiddenError();
    }

    return ok({ data: sanitizeMediaAsset(asset) });
  };

/**
 * `list_folders` — the nested folder structure, reusing `folder.getStructure()`.
 *
 * `getStructure()` returns the whole tree in one query and has no permission-condition
 * filtering, so this is gated on the model-level read permission only — matching
 * `GET /upload/folder-structure` in the admin API.
 */
export const createListFoldersHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async (): Promise<Modules.MCP.McpToolHandlerReturn> => {
    assertMediaPermission(strapi, context, ACTIONS.read, FOLDER_MODEL_UID);

    const structure = await getService('folder', strapi).getStructure();

    return ok({ data: sanitizeMediaFolderTree(structure) });
  };
