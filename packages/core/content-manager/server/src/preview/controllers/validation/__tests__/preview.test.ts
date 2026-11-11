import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { validatePreviewUrl } from '../preview';

const uid = 'api::article.article';

const createStrapi = (draftAndPublish: boolean) =>
  ({
    getModel: jest.fn(() => ({
      modelType: 'contentType',
      kind: 'collectionType',
      options: { draftAndPublish },
    })),
  }) as unknown as Core.Strapi;

describe('validatePreviewUrl', () => {
  test.each(['draft', 'published'] as const)('accepts the %s status', async (status) => {
    const params = await validatePreviewUrl(createStrapi(true), uid, {
      documentId: 'doc',
      status,
    });

    expect(params).toEqual({ documentId: 'doc', status });
  });

  test('rejects any other status', async () => {
    await expect(
      validatePreviewUrl(createStrapi(true), uid, {
        documentId: 'doc',
        status: 'foo' as unknown as 'draft',
      })
    ).rejects.toThrow(errors.ValidationError);
  });

  test.each([
    [true, 'draft'],
    [false, 'published'],
  ])('defaults the status when draft and publish is %s', async (draftAndPublish, status) => {
    const params = await validatePreviewUrl(createStrapi(draftAndPublish), uid, {
      documentId: 'doc',
    });

    expect(params.status).toBe(status);
  });
});
