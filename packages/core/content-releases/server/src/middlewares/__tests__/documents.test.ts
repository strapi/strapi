import { setImmediate } from 'node:timers/promises';

import type { Core, Modules } from '@strapi/types';

import { createDeleteActionsOnDelete, createRevalidateActionsOnDraftChange } from '../documents';

type Context = Parameters<Modules.Documents.Middleware.Middleware>[0];

const UID = 'api::article.article';
const DRAFT = { documentId: 'doc-1', locale: 'en' };

const deleteEntryActions = jest.fn();
const revalidateEntryActions = jest.fn();
const logError = jest.fn();

const strapi = {
  plugin: () => ({
    service: (name: string) =>
      name === 'release-action' ? { deleteEntryActions, revalidateEntryActions } : undefined,
  }),
  log: { error: logError },
} as unknown as Core.Strapi;

// The middleware's work on releases runs after it returns: let it settle before asserting
const runMiddleware = async (
  middleware: Modules.Documents.Middleware.Middleware,
  ctx: unknown,
  result: unknown = DRAFT
) => {
  const returned = await middleware(ctx as Context, jest.fn().mockResolvedValue(result));
  await setImmediate();

  return returned;
};

beforeEach(() => {
  jest.clearAllMocks();
  deleteEntryActions.mockResolvedValue(undefined);
  revalidateEntryActions.mockResolvedValue(undefined);
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

    expect(revalidateEntryActions.mock.calls).toStrictEqual([[UID, DRAFT]]);
  });

  it('revalidates the release actions of each locale whose draft was discarded', async () => {
    const frDraft = { documentId: 'doc-1', locale: 'fr' };

    await changeDraft('discardDraft', { documentId: 'doc-1', entries: [DRAFT, frDraft] });

    expect(revalidateEntryActions.mock.calls).toStrictEqual([
      [UID, DRAFT],
      [UID, frDraft],
    ]);
  });

  it('revalidates an updated entry that has its own `entries` field as one entry', async () => {
    const draft = { ...DRAFT, entries: [] };

    await changeDraft('update', draft);

    expect(revalidateEntryActions.mock.calls).toStrictEqual([[UID, draft]]);
  });

  it.each(['update', 'discardDraft'] as const)(
    'logs a failure to revalidate after %s and still returns the result',
    async (action) => {
      revalidateEntryActions.mockRejectedValue(new Error('revalidation failed'));
      const result = action === 'update' ? DRAFT : { documentId: 'doc-1', entries: [DRAFT] };

      expect(await changeDraft(action, result)).toEqual(result);
      expect(logError).toHaveBeenCalledWith(
        `Error while updating release actions after ${action}`,
        expect.objectContaining({ error: expect.any(Error) })
      );
    }
  );
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

    expect(deleteEntryActions.mock.calls).toStrictEqual([
      [{ contentType: UID, entryDocumentId: 'doc-1', locale: 'en' }],
    ]);
  });

  it('deletes the actions of every locale when every locale is deleted', async () => {
    await deleteEntry('*');

    expect(deleteEntryActions.mock.calls).toStrictEqual([
      [{ contentType: UID, entryDocumentId: 'doc-1' }],
    ]);
  });

  it('logs a failure to delete the actions and still returns the deleted entry', async () => {
    deleteEntryActions.mockRejectedValue(new Error('delete failed'));

    const result = await deleteEntry();

    expect(result).toEqual(DRAFT);
    expect(logError).toHaveBeenCalledWith(
      'Error while deleting release actions after delete',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
