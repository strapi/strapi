import EE from '@strapi/strapi/dist/utils/ee';
import type { CreateReleaseAction } from '../../../../shared/contracts/release-actions';
import createReleaseValidationService from '../validation';

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
  contentType: jest.fn(),
};

jest.mock('@strapi/strapi/dist/utils/ee', () => ({
  features: {
    get: jest.fn(),
  },
}));

describe('Release Validation service', () => {
  describe('validateEntryContentType', () => {
    it('throws an error if the content type does not exist', () => {
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: baseStrapiMock });

      expect(() => releaseValidationService.validateEntryContentType('api::plop.plop')).toThrow(
        'No content type found for uid api::plop.plop'
      );
    });

    it('throws an error if the content type does not have draftAndPublish enabled', () => {
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn().mockReturnValue({
          options: {},
        }),
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      expect(() =>
        releaseValidationService.validateEntryContentType('api::category.category')
      ).toThrow(
        'Content type with uid api::category.category does not have draftAndPublish enabled'
      );
    });
  });

  describe('validateUniqueEntry', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn().mockReturnValue({
          options: {
            draftAndPublish: true,
          },
        }),
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      const mockReleaseAction: CreateReleaseAction.Request['body'] = {
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() =>
        releaseValidationService.validateUniqueEntry(1, mockReleaseAction)
      ).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if a contentType entry already exists in the release', () => {
      const strapiMock = {
        ...baseStrapiMock,
        contentType: jest.fn().mockReturnValue({
          options: {
            draftAndPublish: true,
          },
        }),
        entityService: {
          findOne: jest.fn().mockReturnValue({
            actions: [
              {
                contentType: 'api::category.category',
                entry: {
                  id: 1,
                },
              },
            ],
          }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      const mockReleaseAction: CreateReleaseAction.Request['body'] = {
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() =>
        releaseValidationService.validateUniqueEntry(1, mockReleaseAction)
      ).rejects.toThrow(
        'Entry with id 1 and contentType api::category.category already exists in release with id 1'
      );
    });
  });

  describe('validatePendingReleasesLimit', () => {
    it('should throw an error if the default pending release limit has been reached', () => {
      // @ts-expect-error - get is a mock
      EE.features.get.mockReturnValue({});
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 4]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      expect(() => releaseValidationService.validatePendingReleasesLimit()).rejects.toThrow(
        'You have reached the maximum number of pending releases'
      );
    });

    it('should pass if the default pending release limit has NOT been reached', async () => {
      // @ts-expect-error - get is a mock
      EE.features.get.mockReturnValue({});
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 2]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(releaseValidationService.validatePendingReleasesLimit()).resolves.not.toThrow();
    });

    it('should throw an error if the license pending release limit has been reached', () => {
      // @ts-expect-error - get is a mock
      EE.features.get.mockReturnValue({
        options: {
          maximumReleases: 5,
        },
      });
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 5]),
          }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      expect(() => releaseValidationService.validatePendingReleasesLimit()).rejects.toThrow(
        'You have reached the maximum number of pending releases'
      );
    });

    it('should pass if the license pending release limit has NOT been reached', async () => {
      // @ts-expect-error - get is a mock
      EE.features.get.mockReturnValue({
        options: {
          maximumReleases: 5,
        },
      });
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            findWithCount: jest.fn().mockReturnValue([[], 4]),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(releaseValidationService.validatePendingReleasesLimit()).resolves.not.toThrow();
    });
  });

  describe('validateUniqueNameForPendingRelease', () => {
    it('should throw an error if a release with the same name already exists', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findMany: jest.fn().mockReturnValue([
            {
              name: 'release1',
            },
          ]),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(
        releaseValidationService.validateUniqueNameForPendingRelease('release1')
      ).rejects.toThrow('Release with name release1 already exists');
    });

    it('should pass if a release with the same name does NOT already exist', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findMany: jest.fn().mockReturnValue([]),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: strapiMock });

      await expect(
        releaseValidationService.validateUniqueNameForPendingRelease('release1')
      ).resolves.not.toThrow();
    });
  });

  describe('validateScheduledAtIsLaterThanNow', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2021-01-01'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should throw an error if the scheduledAt date is in the past', () => {
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: baseStrapiMock });

      expect(() =>
        releaseValidationService.validateScheduledAtIsLaterThanNow(new Date('2020-01-01'))
      ).rejects.toThrow('Scheduled at must be later than now');
    });

    it('should pass if the scheduledAt date is in the future', () => {
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: baseStrapiMock });

      expect(() =>
        releaseValidationService.validateScheduledAtIsLaterThanNow(new Date('2022-01-01'))
      ).not.toThrow();
    });
  });
});
