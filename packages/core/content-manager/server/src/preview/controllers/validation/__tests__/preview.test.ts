import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { validatePreviewUrl } from '../preview';

const uid: UID.ContentType = 'api::article.article';
const singleTypeUid: UID.ContentType = 'api::homepage.homepage';

const createStrapi = (draftAndPublish: boolean) =>
  ({
    getModel: jest.fn(() => ({
      modelType: 'contentType',
      kind: 'collectionType',
      options: { draftAndPublish },
    })),
  }) as unknown as Core.Strapi;

const createSingleTypeStrapi = (documents: Record<string, string>) => {
  const findFirst = jest.fn(async ({ locale }: { locale?: string } = {}) => {
    // Mirror the document service: without a locale, the default locale ('en') is used
    const documentId = documents[locale ?? 'en'];
    return documentId ? { documentId } : null;
  });

  const strapi = {
    getModel: jest.fn(() => ({
      modelType: 'contentType',
      kind: 'singleType',
      options: { draftAndPublish: true },
    })),
    documents: jest.fn(() => ({ findFirst })),
  } as unknown as Core.Strapi;

  return { strapi, findFirst };
};

describe('validatePreviewUrl', () => {
  test.each(['draft', 'published'] as const)('accepts the %s status', async (status) => {
    const params = await validatePreviewUrl(createStrapi(true), uid, {
      documentId: 'doc',
      status,
    });

    expect(params).toEqual({ documentId: 'doc', status });
  });

  test('omits a null locale', async () => {
    const params = await validatePreviewUrl(createStrapi(true), uid, {
      documentId: 'doc',
      locale: null,
      status: 'draft',
    });

    expect(params).toStrictEqual({ documentId: 'doc', status: 'draft' });
  });

  test.each(['', 'en'])('keeps the %j locale', async (locale) => {
    const params = await validatePreviewUrl(createStrapi(true), uid, {
      documentId: 'doc',
      locale,
      status: 'draft',
    });

    expect(params).toStrictEqual({ documentId: 'doc', locale, status: 'draft' });
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

  test('resolves a single type in the requested locale', async () => {
    // Only the non-default locale has an entry
    const { strapi, findFirst } = createSingleTypeStrapi({ da: 'doc-da' });

    const params = await validatePreviewUrl(strapi, singleTypeUid, { locale: 'da' });

    expect(findFirst).toHaveBeenCalledWith({ locale: 'da' });
    expect(params).toStrictEqual({ documentId: 'doc-da', locale: 'da', status: 'draft' });
  });

  test('resolves a single type in the default locale when none is requested', async () => {
    const { strapi, findFirst } = createSingleTypeStrapi({ en: 'doc-en' });

    const params = await validatePreviewUrl(strapi, singleTypeUid, { locale: null });

    expect(findFirst).toHaveBeenCalledWith({});
    expect(params).toStrictEqual({ documentId: 'doc-en', status: 'draft' });
  });

  test('throws when the single type has no entry in the requested locale', async () => {
    const { strapi } = createSingleTypeStrapi({ en: 'doc-en' });

    await expect(validatePreviewUrl(strapi, singleTypeUid, { locale: 'da' })).rejects.toThrow(
      errors.NotFoundError
    );
  });
});
