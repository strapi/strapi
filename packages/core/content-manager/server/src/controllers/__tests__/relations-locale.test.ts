// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import relations from '../relations';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';

const articleModel = {
  uid: ARTICLE_UID,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    tags: { type: 'relation', target: TAG_UID },
  },
};

const tagModel = {
  uid: TAG_UID,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    name: { type: 'string' },
  },
};

const findOne = jest.fn();

const setupStrapi = (plugins: Record<string, unknown>) => {
  global.strapi = {
    getModel: jest.fn((uid: string) => {
      if (uid === ARTICLE_UID) {
        return articleModel;
      }
      if (uid === TAG_UID) {
        return tagModel;
      }
      return null;
    }),
    plugins: {
      ...plugins,
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              can: { read: jest.fn().mockReturnValue(true) },
              cannot: { read: jest.fn().mockReturnValue(false) },
              sanitizedQuery: { read: jest.fn().mockResolvedValue({}) },
            }),
          },
          'populate-builder': () => ({
            populateFromQuery: jest.fn().mockReturnThis(),
            build: jest.fn().mockResolvedValue({}),
          }),
          'content-types': {
            findConfiguration: jest.fn().mockResolvedValue({
              metadatas: { tags: { edit: { mainField: 'name' } } },
            }),
          },
        },
      },
    },
    db: {
      query: jest.fn().mockReturnValue({ findOne }),
    },
  } as any;
};

const createCtx = () => {
  return createContext(
    {
      params: { model: ARTICLE_UID, targetField: 'tags' },
      query: { locale: 'fr' },
    },
    { state: { userAbility: {} } }
  );
};

describe('extractAndValidateRequestInfo locale handling', () => {
  beforeEach(() => {
    findOne.mockReset();
    findOne.mockResolvedValue({ id: 10 });
  });

  test('filters the source entry and selects the target locale when both are localized', async () => {
    setupStrapi({
      i18n: {
        services: {
          'content-types': { isLocalizedContentType: jest.fn(() => true) },
        },
      },
    });

    const info = await relations.extractAndValidateRequestInfo(createCtx(), 'article-doc');

    expect(info.locale).toBe('fr');
    expect(info.source.isLocalized).toBe(true);
    expect(info.target.isLocalized).toBe(true);
    expect(info.fieldsToSelect).toContain('locale');
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentId: 'article-doc', locale: 'fr' } })
    );
  });

  test('ignores the locale when neither side is localized', async () => {
    setupStrapi({
      i18n: {
        services: {
          'content-types': { isLocalizedContentType: jest.fn(() => false) },
        },
      },
    });

    const info = await relations.extractAndValidateRequestInfo(createCtx(), 'article-doc');

    expect(info.locale).toBe('fr');
    expect(info.source.isLocalized).toBe(false);
    expect(info.target.isLocalized).toBe(false);
    expect(info.fieldsToSelect).not.toContain('locale');
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentId: 'article-doc' } })
    );
  });

  test('throws when the i18n plugin is not installed', async () => {
    setupStrapi({});

    await expect(
      relations.extractAndValidateRequestInfo(createCtx(), 'article-doc')
    ).rejects.toThrow(TypeError);
  });
});
