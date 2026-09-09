import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { ACTIONS, FILE_MODEL_UID, FOLDER_MODEL_UID } from '../../constants';
import { findEntityAndCheckPermissions } from '../../controllers/utils/find-entity-and-check-permissions';
import { assertMediaPermission } from '../permissions';
import { sanitizeMediaAsset } from '../sanitizers/sanitize-media';
import {
  MCP_NOT_FOUND_ASSET,
  MCP_UPDATE_ASSET_NO_FIELDS,
  MCP_MOVE_ASSETS_DESTINATION_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_FORBIDDEN,
  MCP_MOVE_ASSETS_ID_FAILED,
} from './constants';
import { ok } from '../utils';

// Type-level only: the MCP SDK validates `args` against the tool's strict Zod input schema
// before the handler runs, so unknown keys never reach here.
type MediaUpdateAssetArgs = {
  id: number;
  name?: string;
  alternativeText?: string | null;
  caption?: string | null;
};

type MediaMoveAssetsArgs = {
  ids: number[];
  folder: number | null;
};

/** The metadata keys `media_update_asset` may write. Everything else is rejected by the schema. */
const WRITABLE_FIELDS = ['name', 'alternativeText', 'caption'] as const;

/**
 * Picks the metadata the caller actually sent.
 *
 * `updateFileInfo` treats nil as "keep the stored value" (`_.isNil`), so an explicit
 * `alternativeText: null` cannot be forwarded as null — it would be read as "unchanged"
 * instead of "clear it". Clearing is expressed as an empty string, which is what the admin
 * panel writes when the field is emptied.
 */
const buildFileInfo = (args: MediaUpdateAssetArgs): Record<string, string> => {
  const fileInfo: Record<string, string> = {};

  for (const field of WRITABLE_FIELDS) {
    const value = args[field];

    if (value !== undefined) {
      fileInfo[field] = value === null ? '' : value;
    }
  }

  return fileInfo;
};

/**
 * `media_update_asset` — edits the writable metadata of one asset.
 *
 * Gated on `plugin::upload.assets.update` and mirrors `PUT /upload/files/:id`: the same
 * `findEntityAndCheckPermissions` row-level check, the same `updateFileInfo` service call, and
 * the same `updatedBy` attribution from the session user.
 *
 * The response carries the updated asset through the read sanitizer, so a client can confirm
 * the write without a second `media_get_asset` round-trip — and so provider fields stay
 * invisible on the write path too.
 */
export const createMediaUpdateAssetHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id, ...metadata } = args as MediaUpdateAssetArgs;
    const fileInfo = buildFileInfo(metadata as MediaUpdateAssetArgs);

    // A patch with no writable field is a caller error, not a no-op success: the schema cannot
    // express "at least one of" without becoming a ZodEffects the registry can't publish.
    if (Object.keys(fileInfo).length === 0) {
      throw new errors.ValidationError(MCP_UPDATE_ASSET_NO_FIELDS);
    }

    // Model-level gate first, so a token without the action is refused before any DB read.
    // `findEntityAndCheckPermissions` only covers the row-level check.
    assertMediaPermission(strapi, context, ACTIONS.update, FILE_MODEL_UID);

    // Row-level check, shared with the admin controller: resolves the creator's roles so an
    // owner-scoped permission condition is evaluated against the same subject the REST API
    // would build, and throws Forbidden when a condition excludes this asset.
    //
    // Its NotFoundError carries no message, which would reach the agent as a bare "Not Found";
    // rethrowing adds the same wording the read tools use.
    try {
      await findEntityAndCheckPermissions(
        context.userAbility,
        ACTIONS.update,
        FILE_MODEL_UID,
        id,
        strapi
      );
    } catch (error) {
      if (error instanceof errors.NotFoundError) {
        throw new errors.NotFoundError(MCP_NOT_FOUND_ASSET);
      }

      throw error;
    }

    const updated = await getService('upload', strapi).updateFileInfo(id, fileInfo, {
      user: context.user,
    });

    return ok({ data: sanitizeMediaAsset(updated) });
  };

/**
 * Resolves the destination folder for `media_move_assets`, and rejects one that does not exist.
 *
 * `null` is the media library root and always valid. A named folder is looked up so a typo — or a
 * folder id passed where the agent meant an asset — is refused before anything is moved, matching
 * the `folder-exists` test the admin bulk-move validation applies to `destinationFolderId`.
 *
 * A bad destination is the one failure that rejects the whole call rather than being reported per
 * id: it is a property of the request, not of any single asset, so every id would fail for the
 * same reason and a per-id report would say nothing the agent could act on.
 */
const resolveDestinationFolder = async (strapi: Core.Strapi, folder: number | null) => {
  if (folder === null) {
    return null;
  }

  const destination = await strapi.db.query(FOLDER_MODEL_UID).findOne({
    select: ['id', 'name'],
    where: { id: folder },
  });

  if (destination === null || destination === undefined) {
    throw new errors.ValidationError(MCP_MOVE_ASSETS_DESTINATION_NOT_FOUND);
  }

  return { id: Number(destination.id), name: String(destination.name ?? '') };
};

/**
 * `media_move_assets` — moves assets between folders in bulk.
 *
 * Bulk with a per-id report, rather than all-or-nothing: an agent reorganising a library moves
 * many assets at once, and one bad id among good ones must not discard the valid moves. Each
 * asset is moved on its own, so a failure is confined to its own id and the response says exactly
 * which ids to retry.
 *
 * That is why this does not reuse the admin `/actions/bulk-move` controller path, whose single
 * transaction is all-or-nothing by construction (and which also handles folders, out of scope
 * here). It goes through `updateFileInfo` instead — the same service `media_update_asset` and
 * `PUT /upload/files/:id` use — which sets the `folder` relation, recomputes the private
 * `folderPath`, attributes `updatedBy`, and emits `media.update` per asset. Replicating the
 * controller's raw join-table writes would skip all four.
 *
 * The moves are sequential on purpose. Each one writes the join table and `folderPath` for its
 * asset, and a bounded reorganisation (100 ids max, per the input schema) is not worth the
 * connection-pool contention of firing them in parallel.
 */
export const createMediaMoveAssetsHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { ids, folder } = args as MediaMoveAssetsArgs;

    // Model-level gate first, so a token without the action is refused before any DB read.
    assertMediaPermission(strapi, context, ACTIONS.update, FILE_MODEL_UID);

    const destinationFolder = await resolveDestinationFolder(strapi, folder);

    const moved: ReturnType<typeof sanitizeMediaAsset>[] = [];
    const failed: { id: number; reason: string }[] = [];

    // `ids` can repeat an id; de-duplicating keeps the report one entry per id rather than
    // reporting the same asset twice for a request that moved it once.
    for (const id of [...new Set(ids)]) {
      try {
        // Row-level check, shared with the admin controller: an owner-scoped permission
        // condition is evaluated against the same subject the REST API would build.
        await findEntityAndCheckPermissions(
          context.userAbility,
          ACTIONS.update,
          FILE_MODEL_UID,
          id,
          strapi
        );
        const updated = await getService('upload', strapi).updateFileInfo(
          id,
          // `updateFileInfo` reads `undefined` as "keep the stored folder" and null as the root,
          // so the destination is forwarded as-is.
          { folder },
          { user: context.user }
        );

        // `updateFileInfo` resolves the row it wrote without the `folder` relation populated, so
        // the destination is attached here instead of costing a read-back per asset.
        moved.push(sanitizeMediaAsset({ ...updated, folder: destinationFolder }));
      } catch (error) {
        if (error instanceof errors.NotFoundError) {
          failed.push({ id, reason: MCP_MOVE_ASSETS_ID_NOT_FOUND });
          continue;
        }

        if (error instanceof errors.ForbiddenError) {
          failed.push({ id, reason: MCP_MOVE_ASSETS_ID_FORBIDDEN });
          continue;
        }

        /**
         * Any other failure — a DB error, a provider fault — is reported against this id too,
         * rather than thrown.
         *
         * Throwing here would be the one way to lose committed work silently: a tool error
         * reaches the client as `{ content: [text], isError: true }` with NO
         * `structuredContent` (see `tool-registry.ts`), so an error on the third id would
         * discard the report saying the first two had already moved. The agent would be left
         * unable to tell which ids to retry — exactly the recoverability this tool exists to
         * provide.
         *
         * The message is carried through verbatim so the real fault is still legible, and the
         * loop continues: one broken asset must not strand the rest of a reorganisation.
         */
        failed.push({
          id,
          reason: MCP_MOVE_ASSETS_ID_FAILED(error instanceof Error ? error.message : String(error)),
        });
      }
    }

    /**
     * A request where nothing moved still returns the per-id report.
     *
     * `moved: []` alongside a populated `failed` is not ambiguous — it says plainly that nothing
     * moved and why, per id. Throwing instead would drop `structuredContent` entirely (a tool
     * error carries text only), so `ids: [999]` would get prose while `ids: [1, 999]` got a
     * machine-readable entry, for the same class of mistake.
     *
     * The only failure that still rejects the whole call is an invalid destination folder, which
     * is checked before the loop: nothing has moved, so there is no report to preserve.
     */
    return ok({ destinationFolder, moved, failed });
  };
