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
    // morphToOne / morphToMany carry no `target` key
    morphWithoutTarget: { type: 'relation', relation: 'morphToMany' },
    // An attribute can still carry `target` explicitly set to undefined
    morphWithUndefinedTarget: { type: 'relation', relation: 'morphToOne', target: undefined },
    // A broken schema can carry `target: null`, which neither the old nor the new check rejects
    relationWithNullTarget: { type: 'relation', relation: 'manyToOne', target: null },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
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

beforeEach(() => {
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
              // Denies the field read so a request that passes the morph check stops right after it
              cannot: { read: jest.fn().mockReturnValue(true) },
            }),
          },
        },
      },
    },
  } as any;
});

const createCtx = (targetField: string) => {
  return createContext(
    { params: { model: ARTICLE_UID, targetField }, query: {} },
    { state: { userAbility: {} } }
  );
};

describe('relations morph check (extractAndValidateRequestInfo)', () => {
  test('rejects a relation attribute without a target key', async () => {
    await expect(
      relations.extractAndValidateRequestInfo(createCtx('morphWithoutTarget'))
    ).rejects.toThrow(
      new errors.ValidationError(
        `The relational field morphWithoutTarget on ${ARTICLE_UID} has no target model`
      )
    );
  });

  test('rejects a relation attribute whose target is explicitly undefined', async () => {
    await expect(
      relations.extractAndValidateRequestInfo(createCtx('morphWithUndefinedTarget'))
    ).rejects.toThrow(
      new errors.ValidationError(
        `The relational field morphWithUndefinedTarget on ${ARTICLE_UID} has no target model`
      )
    );
  });

  test('lets a relation attribute whose target is null through the morph check', async () => {
    // Only `undefined` is rejected: a null target reaches the next guard (field read permission)
    await expect(
      relations.extractAndValidateRequestInfo(createCtx('relationWithNullTarget'))
    ).rejects.toThrow(errors.ForbiddenError);
  });

  test('lets a relation attribute with a target through the morph check', async () => {
    // The next guard (field read permission) is reached, so the morph check passed
    await expect(relations.extractAndValidateRequestInfo(createCtx('tags'))).rejects.toThrow(
      errors.ForbiddenError
    );
  });
});
