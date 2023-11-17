import { ReleaseActionCreateArgs } from '../../../../shared/types';
import createReleaseValidationService from '../validation';

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
  contentType: jest.fn(),
};

describe('releaseValidation service', () => {
  describe('validateEntryContentType', () => {
    it('throws an error if the content type does not exist', () => {
      // @ts-expect-error Ignore missing properties
      const releaseValidationService = createReleaseValidationService({ strapi: baseStrapiMock });

      const mockReleaseAction: ReleaseActionCreateArgs = {
        releaseId: 1,
        entry: {
          id: 1,
          contentType: 'api::plop.plop',
        },
        type: 'publish',
      };

      expect(() => releaseValidationService.validateEntryContentType(mockReleaseAction)).toThrow(
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

      const mockReleaseAction: ReleaseActionCreateArgs = {
        releaseId: 1,
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() => releaseValidationService.validateEntryContentType(mockReleaseAction)).toThrow(
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

      const mockReleaseAction: ReleaseActionCreateArgs = {
        releaseId: 1,
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() => releaseValidationService.validateUniqueEntry(mockReleaseAction)).rejects.toThrow(
        'No release found for id 1'
      );
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

      const mockReleaseAction: ReleaseActionCreateArgs = {
        releaseId: 1,
        entry: {
          id: 1,
          contentType: 'api::category.category',
        },
        type: 'publish',
      };

      expect(() => releaseValidationService.validateUniqueEntry(mockReleaseAction)).rejects.toThrow(
        'Entry with id 1 and contentType api::category.category already exists in release with id 1'
      );
    });
  });
});
