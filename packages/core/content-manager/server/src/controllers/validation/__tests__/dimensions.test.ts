import { getDocumentLocaleAndStatus } from '../dimensions';

describe('getDocumentDimensions', () => {
  const modelWithDraftAndPublishUID = 'application::model.model';
  const modelWithoutDraftAndPublishUID = 'application::nodraft.nodraft';

  global.strapi = {
    getModel: jest.fn((uid) => {
      if (uid === modelWithDraftAndPublishUID) {
        return {
          options: {
            draftAndPublish: true,
          },
        };
      }

      return {};
    }),
  } as any;

  test('invalid status', () => {
    expect(() =>
      getDocumentLocaleAndStatus(
        { locale: 'en', status: 'notAStatus' },
        modelWithDraftAndPublishUID
      )
    ).rejects.toThrow();
  });

  test('invalid locale - string array when not supported', () => {
    expect(() =>
      // Multiple locales are not supported here
      getDocumentLocaleAndStatus(
        { locale: ['en', 'fr'], status: 'draft' },
        modelWithDraftAndPublishUID
      )
    ).rejects.toThrow();
  });

  test('invalid locale - mixed array', () => {
    expect(() =>
      getDocumentLocaleAndStatus(
        // Numbers are not allowed as locales
        { locale: ['en', 'fr', 123], status: 'published' },
        modelWithDraftAndPublishUID,
        { allowMultipleLocales: true }
      )
    ).rejects.toThrow();
  });

  test('neither status or locale are required', () => {
    expect(getDocumentLocaleAndStatus({}, modelWithDraftAndPublishUID)).resolves.toEqual({});
  });

  test('status = modifed is invalid', () => {
    expect(
      getDocumentLocaleAndStatus({ status: 'modified' }, modelWithDraftAndPublishUID)
    ).rejects.toThrow();
  });

  test('valid status only', () => {
    expect(
      getDocumentLocaleAndStatus({ status: 'draft' }, modelWithDraftAndPublishUID)
    ).resolves.toEqual({
      status: 'draft',
    });
  });

  test('valid locale only', () => {
    expect(
      getDocumentLocaleAndStatus({ locale: 'en' }, modelWithDraftAndPublishUID)
    ).resolves.toEqual({
      locale: 'en',
    });
  });

  test('valid status and locale', () => {
    expect(
      getDocumentLocaleAndStatus({ locale: 'en', status: 'published' }, modelWithDraftAndPublishUID)
    ).resolves.toEqual({
      locale: 'en',
      status: 'published',
    });
  });

  test("default status to published if the model does'nt have draft and publish enabled", () => {
    expect(
      getDocumentLocaleAndStatus({ locale: 'en' }, modelWithoutDraftAndPublishUID)
    ).resolves.toEqual({
      locale: 'en',
      status: 'published',
    });
  });
});
