import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import createReleaseActionService from '../release-action';

describe('Release Action service', () => {
  it('deletes all release actions given a content type uid', async () => {
    const strapiMock = {
      entityService: {
        findMany: jest.fn().mockReturnValue([{ id: 1, contentType: 'api::test.test' }]),
      },
      db: {
        query: jest.fn().mockReturnValue({
          deleteMany: jest.fn(),
        }),
      },
    };

    // @ts-expect-error Ignore missing properties
    const releaseActionService = createReleaseActionService({ strapi: strapiMock });
    await releaseActionService.deleteManyForContentType('api::test.test');

    expect(strapiMock.entityService.findMany).toHaveBeenCalledWith(RELEASE_ACTION_MODEL_UID, {
      filters: {
        contentType: 'api::test.test',
      },
    });
    expect(strapiMock.db.query().deleteMany).toHaveBeenCalledWith({
      where: {
        id: { $in: [1] },
      },
    });
  });
});
