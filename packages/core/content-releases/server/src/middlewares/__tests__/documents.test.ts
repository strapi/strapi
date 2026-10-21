import { setImmediate } from 'node:timers/promises';

import type { Core, Modules } from '@strapi/types';

import { createDeleteActionsOnDelete, createRevalidateActionsOnDraftChange } from '../documents';

type Context = Parameters<Modules.Documents.Middleware.Middleware>[0];

const UID = 'api::article.article';
const DRAFT = { documentId: 'doc-1', locale: 'en' };

// The planned actions of one entry's locale
const entryWhere = (draft: { documentId: string; locale?: string }) => ({
  contentType: UID,
  entryDocumentId: draft.documentId,
  locale: draft.locale,
});

const deletePlannedActions = jest.fn();
const revalidatePlannedActions = jest.fn();
const logError = jest.fn();

// The caller's transaction: the work registered on its commit waits for `commit()`
let commitCallbacks: (() => unknown)[] = [];
const commit = () => {
  commitCallbacks.forEach((callback) => callback());
  commitCallbacks = [];
};

const strapi = {
  plugin: () => ({
    service: (name: string) =>
      name === 'release-action' ? { deletePlannedActions, revalidatePlannedActions } : undefined,
  }),
  db: {
    // The middleware runs inside the caller's transaction unless a test says otherwise
    inTransaction: jest.fn(() => true),
    transaction: async (work: (params: { onCommit: (cb: () => unknown) => void }) => unknown) =>
      work({ onCommit: (cb) => commitCallbacks.push(cb) }),
  },
  log: { error: logError },
} as unknown as Core.Strapi;

// The middleware's work on releases runs after the caller's commit, without being awaited: commit
// and let it settle before asserting
const runMiddleware = async (
  middleware: Modules.Documents.Middleware.Middleware,
  ctx: unknown,
  result: unknown = DRAFT
) => {
  const returned = await middleware(ctx as Context, jest.fn().mockResolvedValue(result));
  await setImmediate();
  commit();
  await setImmediate();

  return returned;
};

beforeEach(() => {
  jest.clearAllMocks();
  commitCallbacks = [];
  deletePlannedActions.mockResolvedValue(undefined);
  revalidatePlannedActions.mockResolvedValue(undefined);
});

describe('createRevalidateActionsOnDraftChange', () => {
  const changeDraft = (action: 'update' | 'discardDraft', result?: unknown) =>
    runMiddleware(
      createRevalidateActionsOnDraftChange({ strapi }),
      {
        action,
        contentType: { uid: UID, options: { draftAndPublish: true } },
        params: { documentId: 'doc-1' },
      },
      result
    );

  it("revalidates the updated entry's release actions", async () => {
    await changeDraft('update');

    expect(revalidatePlannedActions.mock.calls).toStrictEqual([[entryWhere(DRAFT)]]);
  });

  it("waits for the caller's transaction to commit", async () => {
    await createRevalidateActionsOnDraftChange({ strapi })(
      {
        action: 'update',
        contentType: { uid: UID, options: { draftAndPublish: true } },
        params: { documentId: 'doc-1' },
      } as unknown as Context,
      jest.fn().mockResolvedValue(DRAFT)
    );
    await setImmediate();

    // The entry's change could still roll back, and its draft isn't committed yet
    expect(revalidatePlannedActions).not.toHaveBeenCalled();

    commit();
    await setImmediate();

    expect(revalidatePlannedActions.mock.calls).toStrictEqual([[entryWhere(DRAFT)]]);
  });

  it('revalidates the release actions of each locale whose draft was discarded', async () => {
    const frDraft = { documentId: 'doc-1', locale: 'fr' };

    await changeDraft('discardDraft', { documentId: 'doc-1', entries: [DRAFT, frDraft] });

    expect(revalidatePlannedActions.mock.calls).toStrictEqual([
      [entryWhere(DRAFT)],
      [entryWhere(frDraft)],
    ]);
  });

  it('revalidates an updated entry that has its own `entries` field as one entry', async () => {
    const draft = { ...DRAFT, entries: [] };

    await changeDraft('update', draft);

    expect(revalidatePlannedActions.mock.calls).toStrictEqual([[entryWhere(draft)]]);
  });

  it.each(['update', 'discardDraft'] as const)(
    'logs a failure to revalidate after %s and still returns the result',
    async (action) => {
      revalidatePlannedActions.mockRejectedValue(new Error('revalidation failed'));
      const result = action === 'update' ? DRAFT : { documentId: 'doc-1', entries: [DRAFT] };

      expect(await changeDraft(action, result)).toEqual(result);
      expect(logError).toHaveBeenCalledWith(
        `Error while updating release actions after ${action}`,
        expect.objectContaining({ error: expect.any(Error) })
      );
    }
  );

  it('starts right away when the change was made outside a transaction', async () => {
    jest.mocked(strapi.db.inTransaction).mockReturnValueOnce(false);
    revalidatePlannedActions.mockRejectedValueOnce(new Error('revalidation failed'));

    await createRevalidateActionsOnDraftChange({ strapi })(
      {
        action: 'update',
        contentType: { uid: UID, options: { draftAndPublish: true } },
        params: { documentId: 'doc-1' },
      } as unknown as Context,
      jest.fn().mockResolvedValue(DRAFT)
    );
    await setImmediate();

    // Nothing to wait for: no commit() call
    expect(revalidatePlannedActions.mock.calls).toStrictEqual([[entryWhere(DRAFT)]]);
    expect(logError).toHaveBeenCalledWith(
      'Error while updating release actions after update',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});

describe('createDeleteActionsOnDelete', () => {
  const deleteEntry = (locale = 'en') =>
    runMiddleware(createDeleteActionsOnDelete({ strapi }), {
      action: 'delete',
      contentType: { uid: UID, options: { draftAndPublish: true } },
      params: { documentId: 'doc-1', locale },
    });

  it("deletes the actions of the deleted entry's locale", async () => {
    await deleteEntry();

    expect(deletePlannedActions.mock.calls).toStrictEqual([
      [{ contentType: UID, entryDocumentId: 'doc-1', locale: 'en' }],
    ]);
  });

  it('deletes the actions of every locale when every locale is deleted', async () => {
    await deleteEntry('*');

    expect(deletePlannedActions.mock.calls).toStrictEqual([
      [{ contentType: UID, entryDocumentId: 'doc-1' }],
    ]);
  });

  it('logs a failure to delete the actions and still returns the deleted entry', async () => {
    deletePlannedActions.mockRejectedValue(new Error('delete failed'));

    const result = await deleteEntry();

    expect(result).toEqual(DRAFT);
    expect(logError).toHaveBeenCalledWith(
      'Error while deleting release actions after delete',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
