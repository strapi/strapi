import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { getRequestSpace, runUnscoped } from '../utils/space-scope';
import { isSpaceScopedContentType } from '../services/content-types';

const { ValidationError } = errors;

const MAX_DOCUMENT_IDS = 200;

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',');
  }
  return [];
};

interface EntryRow {
  documentId: string;
  spaceOverride?: boolean;
  space: { id: number; slug: string; name: string; color: string } | null;
}

/**
 * `GET /spaces/entry-states?contentType=<uid>&documentIds=a,b,c`
 *
 * For each document: its workspace (or `null` when shared) and whether the
 * calling workspace may edit it, with the reason when it may not. The admin
 * uses it to lock the edit view and to render the workspace panel. Documents
 * the caller may not see are left out.
 */
const entryState = ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const uid = ctx.query?.contentType as string | undefined;
    if (!uid) {
      throw new ValidationError('contentType is required');
    }

    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType || !isSpaceScopedContentType(contentType)) {
      return ctx.notFound('Unknown or unscoped content type');
    }

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      action: 'plugin::content-manager.explorer.read',
      model: uid,
    });
    if (!permissionsManager.isAllowed) {
      return ctx.forbidden();
    }

    const documentIds = toList(ctx.query?.documentIds).slice(0, MAX_DOCUMENT_IDS);
    if (documentIds.length === 0) {
      ctx.body = { data: {} };
      return;
    }

    const rows = (await runUnscoped(() =>
      strapi.db.query(uid as never).findMany({
        where: { documentId: { $in: documentIds } },
        select: ['documentId', 'spaceOverride'],
        populate: { space: { select: ['id', 'slug', 'name', 'color'] } },
      })
    )) as EntryRow[];

    const request = getRequestSpace(strapi);
    const { decideAccess, resolvePlacement } = getService('access');
    const data: Record<string, unknown> = {};

    // A document has several rows (locales, draft and published) and, once a
    // workspace overrides an inherited entry, rows in two workspaces at once.
    // Group first, then pick the row this caller sees — taking the first row
    // back would answer about whichever one the database happened to return.
    const byDocument = new Map<string, EntryRow[]>();
    for (const row of rows) {
      byDocument.set(row.documentId, [...(byDocument.get(row.documentId) ?? []), row]);
    }

    for (const [documentId, documentRows] of byDocument) {
      const placement = resolvePlacement(
        documentRows.map((row) => ({
          spaceId: row.space?.id ?? null,
          isOverride: row.spaceOverride === true,
        })),
        request?.id
      );
      const visible = documentRows.find(
        (row) => (row.space?.id ?? null) === (placement?.spaceId ?? null)
      );

      const decision = decideAccess({
        model: contentType,
        request,
        entrySpaceId: placement?.spaceId ?? null,
        isOverride: placement?.isOverride ?? false,
      });
      if (!decision.visible) {
        continue;
      }
      data[documentId] = {
        space: visible?.space ?? null,
        editable: decision.editable,
        ...(decision.reason ? { reason: decision.reason } : {}),
        ...(decision.canOverride ? { canOverride: true } : {}),
        ...(decision.isOverride ? { isOverride: true } : {}),
      };
    }

    ctx.body = { data };
  },
});

export default entryState;
