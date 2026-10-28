import { createLifecyclesService } from '../lifecycles';
import { getService } from '../../utils';

jest.mock('../../utils');

const deleteForDocument = jest.fn();
const deleteForUser = jest.fn();
const use = jest.fn();
const subscribe = jest.fn();
const logError = jest.fn();

const strapi = {
  documents: { use },
  db: { lifecycles: { subscribe } },
  log: { error: logError },
} as any;

describe('autosave lifecycles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteForDocument.mockResolvedValue(undefined);
    deleteForUser.mockResolvedValue(undefined);
    jest.mocked(getService).mockReturnValue({
      deleteForDocument,
      deleteForUser,
    } as any);
  });

  it('registers its lifecycle handlers only once', async () => {
    const service = createLifecyclesService({ strapi });

    await service.bootstrap();
    await service.bootstrap();

    expect(use).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('removes only backups for the deleted document locale', async () => {
    const service = createLifecyclesService({ strapi });
    await service.bootstrap();
    const middleware = use.mock.calls[0][0];
    const next = jest.fn(async () => ({ documentId: 'doc-1' }));

    const result = await middleware(
      {
        action: 'delete',
        contentType: { uid: 'api::article.article' },
        params: { documentId: 'doc-1', locale: 'fr' },
      },
      next
    );

    expect(next).toHaveBeenCalled();
    expect(deleteForDocument).toHaveBeenCalledWith({
      contentType: 'api::article.article',
      documentId: 'doc-1',
      locale: 'fr',
    });
    expect(result).toEqual({ documentId: 'doc-1' });
  });

  it('does not clean document backups for non-delete actions', async () => {
    const service = createLifecyclesService({ strapi });
    await service.bootstrap();
    const middleware = use.mock.calls[0][0];

    await middleware(
      {
        action: 'update',
        contentType: { uid: 'api::article.article' },
        params: { documentId: 'doc-1', locale: 'fr' },
      },
      async () => ({ documentId: 'doc-1' })
    );

    expect(deleteForDocument).not.toHaveBeenCalled();
  });

  it('removes backups before deleting an admin user', async () => {
    const service = createLifecyclesService({ strapi });
    await service.bootstrap();
    const subscriber = subscribe.mock.calls[0][0];

    await subscriber.beforeDelete({ params: { where: { id: 7 } } });

    expect(deleteForUser).toHaveBeenCalledWith(7);
  });
});
