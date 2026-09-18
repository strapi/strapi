import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { ACTIONS, FILE_MODEL_UID, FOLDER_MODEL_UID } from '../../constants';
import { findEntityAndCheckPermissions } from '../../controllers/utils/find-entity-and-check-permissions';
import { assertAmbientInstance } from '../ambient-instance';
import { assertMediaPermission } from '../permissions';
import { sanitizeMediaAsset } from '../sanitizers/sanitize-media';
import {
  MCP_NOT_FOUND_ASSET,
  MCP_UPDATE_ASSET_NO_FIELDS,
  MCP_MOVE_ASSETS_DESTINATION_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_NOT_FOUND,
  MCP_MOVE_ASSETS_ID_FORBIDDEN,
  MCP_MOVE_ASSETS_ID_FAILED,
  MCP_DELETE_ASSETS_ID_NOT_FOUND,
  MCP_DELETE_ASSETS_ID_FORBIDDEN,
  MCP_DELETE_ASSETS_ID_FAILED,
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

type MediaDeleteAssetsArgs = {
  ids: number[];
  dryRun?: boolean;
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
export const createMediaUpdateAssetHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async ({
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

    const written = await getService('upload', strapi).updateFileInfo(id, fileInfo, {
      user: context.user,
    });

    const updated = await getService('upload', strapi).findOne(id, ['folder']);

    return ok({ data: sanitizeMediaAsset(updated ?? written) });
  };
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
export const createMediaMoveAssetsHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async ({
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
    for (const id of new Set(ids)) {
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
};

/**
 * `media_delete_assets` — previews or performs the permanent deletion of assets, in bulk.
 *
 * Two branches behind one tool, for the same reason as `media_delete_folder`: the preview and the
 * deletion must agree on what would be destroyed, and splitting them across tools would both let
 * the two drift apart and let an agent reach the destructive one without ever seeing a preview.
 * `dryRun` defaults to true (see the input schema), so omitting the flag previews and deleting
 * takes an explicit `dryRun: false`.
 *
 * Per-id, not all-or-nothing — the opposite of `media_delete_folder`, on purpose. A folder delete
 * cascades, so a mixed id list there is refused outright rather than half-applied over an unknown
 * amount of content. Here each id is exactly one asset, the blast radius of a bad one is nil, and
 * the requirement is explicit: a bad id among good ones must not discard the valid deletions.
 * The dry run reports the same per-id split, so an agent sees which ids will not resolve *before*
 * anything is destroyed rather than after.
 *
 * This does not reuse `file.deleteByIds` (the admin `/actions/bulk-delete` path). That helper
 * fires `upload.remove` under a single `Promise.all`, so the first rejection discards the report
 * of everything already deleted — unrecoverable for an operation with no undo. The removals are
 * driven one at a time here instead, through the same `upload.remove` service, which deletes the
 * provider file and every generated format, emits `media.delete`, and then deletes the row.
 *
 * The deletions are sequential on purpose: each one performs provider I/O, and a bounded batch
 * (100 ids max, per the input schema) is not worth firing at a provider in parallel.
 */
export const createMediaDeleteAssetsHandler = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext
) => {
  assertAmbientInstance(strapi);

  return async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { ids, dryRun = true } = args as MediaDeleteAssetsArgs;

    // Model-level gate first, so a token without the action is refused before any DB read.
    // The preview takes the same gate: it reveals which assets exist and what they are.
    assertMediaPermission(strapi, context, ACTIONS.update, FILE_MODEL_UID);

    const deleted: ReturnType<typeof sanitizeMediaAsset>[] = [];
    const failed: { id: number; reason: string }[] = [];

    // `ids` can repeat an id; de-duplicating keeps the report one entry per id, and stops the
    // second occurrence of an already-deleted asset from being reported as a missing one.
    for (const id of new Set(ids)) {
      let file;

      try {
        // Row-level check, shared with the admin controller: an owner-scoped permission
        // condition is evaluated against the same subject the REST API would build. Run on the
        // dry run too — a preview must not list an asset the executing call would refuse.
        ({ file } = await findEntityAndCheckPermissions(
          context.userAbility,
          ACTIONS.update,
          FILE_MODEL_UID,
          id,
          strapi
        ));
      } catch (error) {
        if (error instanceof errors.NotFoundError) {
          failed.push({ id, reason: MCP_DELETE_ASSETS_ID_NOT_FOUND });
          continue;
        }

        if (error instanceof errors.ForbiddenError) {
          failed.push({ id, reason: MCP_DELETE_ASSETS_ID_FORBIDDEN });
          continue;
        }

        failed.push({
          id,
          reason: MCP_DELETE_ASSETS_ID_FAILED(
            error instanceof Error ? error.message : String(error)
          ),
        });
        continue;
      }

      // The preview stops here: the asset resolved and this token may delete it, which is
      // everything the agent needs to confirm — reported in the same shape the real run uses.
      if (dryRun) {
        deleted.push(sanitizeMediaAsset(file));
        continue;
      }

      try {
        await getService('upload', strapi).remove(file);

        // Reported from the row read before the delete: the asset no longer exists, so this is
        // the only description of it the agent will ever get.
        deleted.push(sanitizeMediaAsset(file));
      } catch (error) {
        /**
         * A failed removal is reported against its own id rather than thrown, for the reason
         * spelled out on `media_move_assets` — a tool error carries no `structuredContent`, so throwing
         * on the third id would discard the report saying the first two are gone. Here that
         * matters more: the earlier deletions cannot be re-read, undone or discovered afterwards.
         */
        failed.push({
          id,
          reason: MCP_DELETE_ASSETS_ID_FAILED(
            error instanceof Error ? error.message : String(error)
          ),
        });
      }
    }

    /**
     * A request where nothing was deleted still returns the per-id report, on both branches:
     * `deleted: []` with every id in `failed` says plainly that nothing happened and why, per id.
     * Throwing instead would drop `structuredContent` entirely, so `ids: [999]` would get prose
     * where `ids: [1, 999]` gets a machine-readable entry, for the same class of mistake.
     */
    return ok({ dryRun, deleted, failed, totalFileNumber: deleted.length });
  };
};
