import { deleteActionsOnDelete, updateActionsOnUpdate } from '../documents';

const contentType = { uid: 'api::article.article', options: { draftAndPublish: true } };

describe('content-releases document middlewares', () => {
  const error = new Error('database unavailable');

  beforeEach(() => {
    global.strapi = {
      db: {
        query: jest.fn(() => ({
          findMany: jest.fn().mockRejectedValue(error),
        })),
      },
      log: {
        error: jest.fn(),
      },
    } as any;
  });

  it('logs a failure to delete release actions after a delete', async () => {
    const result = { documentId: 'doc-1' };
    const ctx = {
      action: 'delete',
      contentType,
      params: { documentId: 'doc-1', locale: 'en' },
    } as any;

    await expect(deleteActionsOnDelete(ctx, async () => result)).resolves.toBe(result);

    expect(strapi.log.error).toHaveBeenCalledWith(
      'Error while deleting release actions after delete',
      { error }
    );
  });

  it('logs a failure to update release actions after an update', async () => {
    const result = { documentId: 'doc-1', locale: 'en' };
    const ctx = { action: 'update', contentType, params: {} } as any;

    await expect(updateActionsOnUpdate(ctx, async () => result)).resolves.toBe(result);

    expect(strapi.log.error).toHaveBeenCalledWith(
      'Error while updating release actions after update',
      { error }
    );
  });
});
