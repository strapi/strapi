import createReleaseService from "../release";

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
};

const mockUser = {
  id: 1,
  username: 'user',
  email: 'user@strapi.io',
  firstname: 'John', 
  isActive: true, 
  blocked: false, 
  preferedLanguage: 'en',
  roles: [], 
  createdAt: '01/01/1900', 
  updatedAt: '01/01/1900',
};

describe('release service', () => {
  describe('update', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          update: jest.fn().mockReturnValue(null),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      expect(() => releaseService.update(1, mockReleaseArgs, { user: mockUser })).rejects.toThrow(
        'No release found for id 1'
      );
    });
  });
  describe('findActions', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: { 
          findOne: jest.fn().mockReturnValue(null),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.findActions(1, ['api::contentType.contentType'], {})).rejects.toThrow('No release found for id 1');
    });
  });
});
