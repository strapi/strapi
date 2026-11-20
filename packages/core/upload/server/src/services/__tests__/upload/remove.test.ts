import createUploadService from '../../upload';

describe('Upload service remove', () => {
  const file = { id: 1, provider: 'local', hash: 'a', ext: '.png', url: '/uploads/a.png' } as any;

  let detached: boolean;
  let steps: string[];

  const expectDetached = (step: string) => {
    expect(detached).toBe(true);
    steps.push(step);
  };

  beforeEach(() => {
    detached = false;
    steps = [];

    global.strapi = {
      config: { get: () => ({ provider: 'local' }) },
      plugins: {
        upload: {
          provider: { delete: jest.fn(async () => expectDetached('provider.delete')) },
          services: { file: {} },
        },
      },
      getModel: () => ({ uid: 'plugin::upload.file', attributes: {} }),
      eventHub: { emit: jest.fn() },
      db: {
        runWithoutAbortSignal: jest.fn(async (cb: () => Promise<unknown>) => {
          detached = true;
          try {
            return await cb();
          } finally {
            detached = false;
          }
        }),
        query: () => ({
          findOne: jest.fn(async () => {
            expectDetached('findOne');
            return file;
          }),
          delete: jest.fn(async () => {
            expectDetached('delete');
            return file;
          }),
        }),
      },
    } as any;
  });

  test('deletes the stored file and then the row, detached from the request abort signal', async () => {
    const uploadService = createUploadService({ strapi: global.strapi } as any);

    await uploadService.remove(file);

    expect(global.strapi.db.runWithoutAbortSignal).toHaveBeenCalledTimes(1);
    expect(steps).toEqual(['provider.delete', 'findOne', 'delete']);
  });
});
