import { destroy } from '../destroy';

describe('Upload plugin destroy function', () => {
  const createStrapiMock = (failOwnedJobs: jest.Mock) =>
    ({
      log: { error: jest.fn() },
      // `getService` resolves through the global strapi
      plugins: { upload: { services: { aiMetadataJobs: { failOwnedJobs } } } },
    }) as any;

  test('fails the AI metadata jobs this server runs, since they cannot complete', async () => {
    const failOwnedJobs = jest.fn().mockResolvedValue(undefined);
    global.strapi = createStrapiMock(failOwnedJobs);

    await destroy({ strapi });

    expect(failOwnedJobs).toHaveBeenCalledTimes(1);
  });

  test('logs, and does not stop the shutdown, when the jobs cannot be failed', async () => {
    const failOwnedJobs = jest.fn().mockRejectedValue(new Error('database down'));
    global.strapi = createStrapiMock(failOwnedJobs);

    await expect(destroy({ strapi })).resolves.toBeUndefined();

    expect(strapi.log.error).toHaveBeenCalledWith(
      'Could not fail the AI metadata jobs of the stopping server'
    );
  });
});
