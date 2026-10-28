import { errors } from '@strapi/utils';
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
  attributes: {
    tags: { type: 'relation', target: TAG_UID },
  },
};

const tagModel = {
  uid: TAG_UID,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  attributes: {
    name: { type: 'string' },
  },
};

const findOne = jest.fn();

beforeEach(() => {
  findOne.mockReset();

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
    localization: { isLocalizedContentType: jest.fn(() => false) },
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create: jest.fn().mockReturnValue({
              can: { read: jest.fn().mockReturnValue(false) },
              cannot: { read: jest.fn().mockReturnValue(true) },
              sanitizedQuery: { read: jest.fn().mockResolvedValue({}) },
            }),
          },
        },
      },
    },
    db: {
      query: jest.fn().mockReturnValue({ findOne }),
    },
  } as any;
});

const createCtx = (params: Record<string, unknown>) => {
  return createContext(
    {
      params: { model: ARTICLE_UID, targetField: 'tags', ...params },
      query: {},
    },
    // Like the Koa helper: sets the response and returns undefined
    { state: { userAbility: {} }, forbidden: jest.fn() }
  );
};

describe('relations when the user cannot read the relational field', () => {
  test('findAvailable throws a ForbiddenError', async () => {
    await expect(relations.findAvailable(createCtx({}))).rejects.toThrow(errors.ForbiddenError);
    expect(findOne).not.toHaveBeenCalled();
  });

  test('findExisting throws a ForbiddenError', async () => {
    await expect(relations.findExisting(createCtx({ id: 'article-doc' }))).rejects.toThrow(
      errors.ForbiddenError
    );
    expect(findOne).not.toHaveBeenCalled();
  });
});
