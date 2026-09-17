import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import {
  getService,
  isBranchableContentType,
  isLocalizedContentType,
  runOnBranch,
  runUnfiltered,
  type BranchRef,
} from '../utils';

import type { DocumentBranchState } from '../services/changes';

const { ForbiddenError, NotFoundError, ValidationError } = errors;

const parseId = (raw: unknown): number => {
  const id = Number(raw);
  if (!Number.isInteger(id)) {
    throw new ValidationError('Invalid branch id');
  }
  return id;
};

const loadBranch = async (raw: unknown) => {
  const id = parseId(raw);
  const branch = await getService('branches').getById(id);
  if (!branch) {
    throw new NotFoundError(`Unknown branch: ${id}`);
  }
  return branch;
};

const assertBranchable = (uid: string) => {
  const model = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!model || !isBranchableContentType(model)) {
    throw new NotFoundError(`Unknown or non-branchable content type: ${uid}`);
  }
  return model;
};

const localeParam = (model: unknown, raw: unknown): string | null =>
  isLocalizedContentType(model) && typeof raw === 'string' && raw ? raw : null;

interface DocumentState {
  state: DocumentBranchState;
  attributes: string[];
  branches: Array<{ id: number; slug: string; name: string; color: string | null }>;
}

const changes = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** GET /branches/:id/changes */
  async list(ctx: any) {
    const branch = await loadBranch(ctx.params?.id);
    ctx.body = await getService('diff').listChanges(branch);
  },

  /** GET /branches/:id/changes/:uid/:documentId?locale= */
  async diff(ctx: any) {
    const branch = await loadBranch(ctx.params?.id);
    const uid = String(ctx.params?.uid ?? '');
    const documentId = String(ctx.params?.documentId ?? '');
    const model = assertBranchable(uid);
    const ref = await getService('branches').toRef(branch);
    const diff = await getService('diff').documentDiff(
      ref,
      uid,
      documentId,
      localeParam(model, ctx.query?.locale)
    );
    if (!diff) {
      throw new NotFoundError('This document has no changes on the branch');
    }
    ctx.body = diff;
  },

  /**
   * DELETE /branches/:id/changes/:uid/:documentId?locale= — discards the
   * branch's changes for a document: its delta (revert to the parent's
   * version) or, for a document created on the branch, the document itself.
   * Requires the Content Manager's delete/update permission on the document.
   */
  async discard(ctx: any) {
    const branch = await loadBranch(ctx.params?.id);
    const uid = String(ctx.params?.uid ?? '');
    const documentId = String(ctx.params?.documentId ?? '');
    const model = assertBranchable(uid);
    const locale = localeParam(model, ctx.query?.locale);
    const ref = await getService('branches').toRef(branch);

    const permissionChecker = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility: ctx.state.userAbility, model: uid });
    if (permissionChecker.cannot.update()) {
      throw new ForbiddenError();
    }

    const changesService = getService('changes');
    const removed = await changesService.remove(
      ref.id,
      uid,
      documentId,
      locale === null ? undefined : locale
    );

    let deletedRows = 0;
    const created: Array<{ id: number; locale: string | null }> = await runUnfiltered(() =>
      strapi.db.query(uid as never).findMany({
        where: { documentId, branch: { id: ref.id }, ...(locale ? { locale } : {}) },
        select: ['id', 'locale'],
      })
    );
    if (created.length > 0) {
      if (permissionChecker.cannot.delete()) {
        throw new ForbiddenError();
      }
      await runOnBranch(ref, () =>
        strapi.documents(uid as never).delete({
          documentId,
          ...(isLocalizedContentType(model) ? { locale: locale ?? '*' } : {}),
        } as never)
      );
      deletedRows = created.length;
    }

    ctx.body = { discardedChanges: removed, deletedDocuments: deletedRows };
  },

  /**
   * GET /branches/states?contentType=&documentIds=a,b,c — per-document badge
   * data for the list view. On a branch: the document's state there. On main:
   * which active branches touch it.
   */
  async states(ctx: any) {
    const uid = String(ctx.query?.contentType ?? '');
    assertBranchable(uid);
    const raw = ctx.query?.documentIds;
    const documentIds = [
      ...new Set(
        (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
          .map((id: unknown) => String(id).trim())
          .filter(Boolean)
      ),
    ] as string[];
    if (documentIds.length === 0) {
      ctx.body = {};
      return;
    }

    const branch = ctx.state?.branch as BranchRef | undefined;
    const changesService = getService('changes');
    const states: Record<string, DocumentState> = {};

    if (branch) {
      const rows = await changesService.getForDocuments(branch.chain, uid, documentIds);
      const created: Array<{
        documentId: string;
        branch: { id: number; slug: string; name: string; color: string | null };
      }> = await runUnfiltered(() =>
        strapi.db.query(uid as never).findMany({
          where: { documentId: { $in: documentIds }, branch: { id: { $in: branch.chain } } },
          select: ['documentId'],
          populate: { branch: { select: ['id', 'slug', 'name', 'color'] } },
        })
      );
      for (const documentId of documentIds) {
        const own = rows.filter((row) => row.entryDocumentId === documentId);
        const createdRow = created.find((row) => row.documentId === documentId);
        const attributes = [...new Set(own.flatMap((row) => Object.keys(row.changes ?? {})))];
        let state: DocumentBranchState = 'inherited';
        if (createdRow) {
          state = 'created';
        } else if (own.some((row) => row.operation === 'delete')) {
          state = 'deleted';
        } else if (own.some((row) => row.operation === 'update')) {
          state = 'modified';
        }
        states[documentId] = {
          state,
          attributes,
          branches: createdRow ? [createdRow.branch] : [],
        };
      }
    } else {
      const rows = await changesService.getForDocumentsAcrossBranches(uid, documentIds);
      for (const documentId of documentIds) {
        const own = rows.filter((row) => row.entryDocumentId === documentId);
        const seen = new Map<number, DocumentState['branches'][number]>();
        for (const row of own) {
          const item = row.branch as unknown as DocumentState['branches'][number];
          if (item?.id !== undefined) {
            seen.set(item.id, {
              id: item.id,
              slug: item.slug,
              name: item.name,
              color: item.color ?? null,
            });
          }
        }
        states[documentId] = {
          state: 'inherited',
          attributes: [...new Set(own.flatMap((row) => Object.keys(row.changes ?? {})))],
          branches: [...seen.values()],
        };
      }
    }

    ctx.body = states;
  },
});

export default changes;
