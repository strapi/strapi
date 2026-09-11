import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { assertAmbientInstance, getFolderService } from '../ambient-instance';
import { ACTIONS, FILE_MODEL_UID, FOLDER_MODEL_UID } from '../../constants';
import { assertMediaPermission } from '../permissions';
import { findEntityAndCheckPermissions } from '../../controllers/utils/find-entity-and-check-permissions';
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
 * Builds the `filters` clause for `media_list_assets`.
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
 * `media_list_assets` — paginated, filtered listing of media files.
 *
 * Permission conditions are applied through the permissions manager
 * (`addPermissionsQueryTo`) so a token restricted by a condition — e.g. own-assets-only —
 * sees the same subset it would through the admin API.
 */
export const createMediaListAssetsHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async ({
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
};

/**
 * `media_get_asset` — a single asset by numeric id.
 *
 * Row-level permission *conditions* are enforced by `findEntityAndCheckPermissions`, the same
 * helper the admin `findOne` controller uses: it populates `createdBy` and the creator's roles
 * before building the CASL subject, which is what the admin conditions read. Checking a subject
 * without those fields would deny a conditioned grant its own assets, and would disagree with
 * `media_list_assets`, where the condition is pushed into the query instead.
 */
export const createMediaGetAssetHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id } = args as GetMediaArgs;

    // Model-level gate first, so a token without upload read at all is refused before a lookup.
    assertMediaPermission(strapi, context, ACTIONS.read, FILE_MODEL_UID);

    let asset;
    try {
      ({ file: asset } = await findEntityAndCheckPermissions(
        context.userAbility,
        ACTIONS.read,
        FILE_MODEL_UID,
        id,
        strapi
      ));
    } catch (error) {
      // The helper is written for HTTP, where a bare NotFoundError is enough. MCP answers an
      // agent, so restate it with the message the other media tools use.
      if (error instanceof errors.NotFoundError) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_ASSET);
      }
      throw error;
    }

    return ok({ data: sanitizeMediaAsset(asset) });
  };
};

/**
 * `media_list_folders` — the nested folder structure, reusing `folder.getStructure()`.
 *
 * `getStructure()` returns the whole tree in one query and has no permission-condition
 * filtering, so this is gated on the model-level read permission only — matching
 * `GET /upload/folder-structure` in the admin API.
 *
 * The factory asserts the handler's instance is the ambient `global.strapi` the folder service
 * actually queries — see `assertAmbientInstance` for why.
 */
export const createMediaListFoldersHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async (): Promise<Modules.MCP.McpToolHandlerReturn> => {
    assertMediaPermission(strapi, context, ACTIONS.read, FOLDER_MODEL_UID);

    const structure = await getFolderService(strapi).getStructure();

    return ok({ data: sanitizeMediaFolderTree(structure) });
  };
};
