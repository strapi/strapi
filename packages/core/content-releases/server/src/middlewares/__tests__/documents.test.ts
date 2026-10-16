import { setImmediate } from 'node:timers/promises';

import type { Core, Modules } from '@strapi/types';

import { createDeleteActionsOnDelete, createUpdateActionsOnUpdate } from '../documents';

type Context = Parameters<Modules.Documents.Middleware.Middleware>[0];

const UID = 'api::article.article';

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
const runMiddleware = async (middleware: Modules.Documents.Middleware.Middleware, ctx: unknown) => {
  const result = await middleware(
    ctx as Context,
    jest.fn().mockResolvedValue({ documentId: 'doc-1', locale: 'en' })
  );
  await setImmediate();

  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  deleteEntryActions.mockResolvedValue(undefined);
  revalidateEntryActions.mockResolvedValue(undefined);
});

describe('createUpdateActionsOnUpdate', () => {
  const updateEntry = () =>
    runMiddleware(createUpdateActionsOnUpdate({ strapi }), {
      action: 'update',
      contentType: { uid: UID, options: { draftAndPublish: true } },
      params: { documentId: 'doc-1' },
    });

  it("revalidates the updated entry's release actions", async () => {
    await updateEntry();

    expect(revalidateEntryActions.mock.calls).toStrictEqual([
      [UID, { documentId: 'doc-1', locale: 'en' }],
    ]);
  });

  it('logs a failure to revalidate and still returns the updated entry', async () => {
    revalidateEntryActions.mockRejectedValue(new Error('revalidation failed'));

    const result = await updateEntry();

    expect(result).toEqual({ documentId: 'doc-1', locale: 'en' });
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

    expect(result).toEqual({ documentId: 'doc-1', locale: 'en' });
    expect(logError).toHaveBeenCalledWith(
      'Error while deleting release actions after delete',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
