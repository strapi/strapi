import type { Schema } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { deleteActionsOnDeleteContentType } from '..';

type Input = Parameters<typeof deleteActionsOnDeleteContentType>[0];

const ARTICLE_UID = 'api::article.article';
const PAGE_UID = 'api::page.page';

const contentType = (uid: string) => ({ uid }) as unknown as Schema.ContentType;

const setupStrapi = () => {
  const execute = jest.fn().mockResolvedValue(undefined);
  const where = jest.fn(() => ({ execute }));
  const queryBuilder = jest.fn(() => ({ delete: () => ({ where }) }));

  global.strapi = { db: { queryBuilder } } as any;

  return { queryBuilder, where };
};

describe('deleteActionsOnDeleteContentType', () => {
  test('does nothing when there are no old content types', async () => {
    const { queryBuilder } = setupStrapi();

    await deleteActionsOnDeleteContentType({
      oldContentTypes: undefined,
      contentTypes: { [ARTICLE_UID]: contentType(ARTICLE_UID) },
    } as unknown as Input);

    expect(queryBuilder).not.toHaveBeenCalled();
  });

  test('deletes the actions of removed content types only', async () => {
    const { queryBuilder, where } = setupStrapi();

    await deleteActionsOnDeleteContentType({
      oldContentTypes: {
        [ARTICLE_UID]: contentType(ARTICLE_UID),
        [PAGE_UID]: contentType(PAGE_UID),
      },
      contentTypes: { [ARTICLE_UID]: contentType(ARTICLE_UID) },
    });

    expect(queryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilder).toHaveBeenCalledWith(RELEASE_ACTION_MODEL_UID);
    expect(where).toHaveBeenCalledWith({ contentType: PAGE_UID });
  });
});
