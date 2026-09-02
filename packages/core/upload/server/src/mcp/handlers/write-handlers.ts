import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { getService } from '../../utils';
import { ACTIONS, FILE_MODEL_UID } from '../../constants';
import { findEntityAndCheckPermissions } from '../../controllers/utils/find-entity-and-check-permissions';
import { assertMediaPermission } from '../permissions';
import { sanitizeMediaAsset } from '../sanitizers/sanitize-media';
import { MCP_NOT_FOUND_ASSET, MCP_UPDATE_ASSET_NO_FIELDS } from './constants';
import { ok } from '../utils';

// Type-level only: the MCP SDK validates `args` against the tool's strict Zod input schema
// before the handler runs, so unknown keys never reach here.
type UpdateMediaArgs = {
  id: number;
  name?: string;
  alternativeText?: string | null;
  caption?: string | null;
};

/** The metadata keys `update_media` may write. Everything else is rejected by the schema. */
const WRITABLE_FIELDS = ['name', 'alternativeText', 'caption'] as const;

/**
 * Picks the metadata the caller actually sent.
 *
 * `updateFileInfo` treats nil as "keep the stored value" (`_.isNil`), so an explicit
 * `alternativeText: null` cannot be forwarded as null — it would be read as "unchanged"
 * instead of "clear it". Clearing is expressed as an empty string, which is what the admin
 * panel writes when the field is emptied.
 */
const buildFileInfo = (args: UpdateMediaArgs): Record<string, string> => {
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
 * `update_media` — edits the writable metadata of one asset.
 *
 * Gated on `plugin::upload.assets.update` and mirrors `PUT /upload/files/:id`: the same
 * `findEntityAndCheckPermissions` row-level check, the same `updateFileInfo` service call, and
 * the same `updatedBy` attribution from the session user.
 *
 * The response carries the updated asset through the read sanitizer, so a client can confirm
 * the write without a second `get_media` round-trip — and so provider fields stay
 * invisible on the write path too.
 */
export const createUpdateMediaHandler =
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { id, ...metadata } = args as UpdateMediaArgs;
    const fileInfo = buildFileInfo(metadata as UpdateMediaArgs);

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
      await findEntityAndCheckPermissions(context.userAbility, ACTIONS.update, FILE_MODEL_UID, id);
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
