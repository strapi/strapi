import { destroy } from '../destroy';

describe('Upload plugin destroy function', () => {
  const createStrapiMock = (failOwnedJobs: jest.Mock) => {
    const aiMetadataJobs = { failOwnedJobs };

    return {
      log: { error: jest.fn() },
      plugin: jest.fn((name: string) => ({
        service: jest.fn((service: string) =>
          name === 'upload' && service === 'aiMetadataJobs' ? aiMetadataJobs : undefined
        ),
      })),
    } as any;
  };

  test('fails the AI metadata jobs this server runs, through the instance it receives', async () => {
    const failOwnedJobs = jest.fn().mockResolvedValue(undefined);
    const strapi = createStrapiMock(failOwnedJobs);
    // A different, global instance must not be the one used
    global.strapi = createStrapiMock(jest.fn());

    await destroy({ strapi });

    expect(failOwnedJobs).toHaveBeenCalledTimes(1);
  });

  test('logs, and does not stop the shutdown, when the jobs cannot be failed', async () => {
    const failOwnedJobs = jest.fn().mockRejectedValue(new Error('database down'));
    const strapi = createStrapiMock(failOwnedJobs);

    await expect(destroy({ strapi })).resolves.toBeUndefined();

    expect(strapi.log.error).toHaveBeenCalledWith(
      'Could not fail the AI metadata jobs of the stopping server'
    );
  });
});
