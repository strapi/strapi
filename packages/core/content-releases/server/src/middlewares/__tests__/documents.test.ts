import { setImmediate } from 'node:timers/promises';

import type { Modules } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { deleteActionsOnDelete } from '../documents';

type Context = Parameters<Modules.Documents.Middleware.Middleware>[0];

const UID = 'api::article.article';

const releaseFindMany = jest.fn();
const actionDeleteMany = jest.fn();
const updateReleaseStatus = jest.fn();

const setupStrapi = ({ localized }: { localized: boolean }) => {
  global.strapi = {
    db: {
      query: jest.fn((uid: string) =>
        uid === RELEASE_ACTION_MODEL_UID
          ? { deleteMany: actionDeleteMany }
          : { findMany: releaseFindMany }
      ),
    },
    plugins: { 'content-releases': { services: { release: { updateReleaseStatus } } } },
    localization: {
      isLocalizedContentType: () => localized,
      getDefaultLocale: jest.fn().mockResolvedValue('en'),
    },
    log: { error: jest.fn() },
  } as unknown as typeof global.strapi;
};

const deleteDocument = async (params: Record<string, unknown>, { draftAndPublish = true } = {}) => {
  const next = jest.fn().mockResolvedValue({ documentId: 'doc-1', entries: [] });
  const ctx = {
    action: 'delete',
    contentType: { uid: UID, options: { draftAndPublish } },
    params: { documentId: 'doc-1', ...params },
  } as unknown as Context;

  await deleteActionsOnDelete(ctx, next);
  await setImmediate();

  return next;
};

describe('deleteActionsOnDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    releaseFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  });

  it.each([
    ['a non-localized entry, without a locale', false, {}, {}],
    ['a non-localized entry, whatever the locale passed', false, { locale: 'en' }, {}],
    ['one locale of a localized entry', true, { locale: 'fr' }, { locale: 'fr' }],
    ['every locale of a localized entry', true, { locale: '*' }, {}],
    [
      'some locales of a localized entry',
      true,
      { locale: ['en', 'fr'] },
      { locale: { $in: ['en', 'fr'] } },
    ],
    ['a localized entry without a locale', true, {}, { locale: 'en' }],
  ])('removes the release actions of %s', async (_, localized, params, localeFilter) => {
    setupStrapi({ localized });

    await deleteDocument(params);

    const where = { contentType: UID, entryDocumentId: 'doc-1', ...localeFilter };
    expect(releaseFindMany.mock.calls).toStrictEqual([[{ where: { actions: where } }]]);
    expect(actionDeleteMany.mock.calls).toStrictEqual([[{ where }]]);
    expect(updateReleaseStatus).toHaveBeenCalledWith(1);
    expect(updateReleaseStatus).toHaveBeenCalledWith(2);
  });

  it('leaves releases alone for a content type without draft and publish', async () => {
    setupStrapi({ localized: false });

    const next = await deleteDocument({}, { draftAndPublish: false });

    expect(next).toHaveBeenCalled();
    expect(actionDeleteMany).not.toHaveBeenCalled();
  });
});
