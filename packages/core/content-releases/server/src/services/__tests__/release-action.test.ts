import createReleaseActionService from '../release-action';

describe('Release Action service', () => {
  it('deletes all release actions given a content type uid', async () => {
    const strapiMock = {
      db: {
        query: jest.fn().mockReturnValue({
          deleteMany: jest.fn(),
        }),
      },
    };

    // @ts-expect-error Ignore missing properties
    const releaseActionService = createReleaseActionService({ strapi: strapiMock });
    await releaseActionService.deleteManyForContentType('api::test.test');

    expect(strapiMock.db.query().deleteMany).toHaveBeenCalledWith({
      where: {
        target_type: 'api::test.test',
      },
    });
  });
});
