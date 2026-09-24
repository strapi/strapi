import type { Schema } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from '../../constants';
import { disableContentTypeLocalized, enableContentTypeLocalized } from '..';

const UID = 'api::article.article';

const createContentType = (localized: boolean) =>
  ({
    uid: UID,
    pluginOptions: { i18n: { localized } },
  }) as unknown as Schema.ContentType;

const isLocalizedContentType = (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
  model.pluginOptions?.i18n?.localized === true;

const execute = jest.fn();
const where = jest.fn(() => ({ execute }));
const update = jest.fn(() => ({ where }));
const queryBuilder = jest.fn(() => ({ update }));
const getDefaultLocale = jest.fn(async () => 'en');

const setupStrapi = ({ withI18n }: { withI18n: boolean }) => {
  global.strapi = {
    db: { queryBuilder },
    plugins:
      withI18n === true
        ? {
            i18n: {
              services: {
                'content-types': { isLocalizedContentType },
                locales: { getDefaultLocale },
              },
            },
          }
        : {},
  } as unknown as typeof global.strapi;
};

const expectLocaleUpdate = (locale: string | null) => {
  expect(queryBuilder).toHaveBeenCalledWith(RELEASE_ACTION_MODEL_UID);
  expect(update).toHaveBeenCalledWith({ locale });
  expect(where).toHaveBeenCalledWith({ contentType: UID });
  expect(execute).toHaveBeenCalledTimes(1);
};

describe('content-releases localized migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('disableContentTypeLocalized', () => {
    it('resets action locales when a content type stops being localized', async () => {
      setupStrapi({ withI18n: true });

      await disableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(true) },
        contentTypes: { [UID]: createContentType(false) },
      });

      expectLocaleUpdate(null);
    });

    it('does nothing when localization is unchanged', async () => {
      setupStrapi({ withI18n: true });

      await disableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(true) },
        contentTypes: { [UID]: createContentType(true) },
      });

      expect(queryBuilder).not.toHaveBeenCalled();
    });

    it('does nothing without previous content types', async () => {
      setupStrapi({ withI18n: true });

      await disableContentTypeLocalized({
        oldContentTypes: undefined as unknown as Record<string, Schema.ContentType>,
        contentTypes: { [UID]: createContentType(false) },
      });

      expect(queryBuilder).not.toHaveBeenCalled();
    });

    it('does nothing without a localization plugin', async () => {
      setupStrapi({ withI18n: false });

      await disableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(true) },
        contentTypes: { [UID]: createContentType(false) },
      });

      expect(queryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('enableContentTypeLocalized', () => {
    it('sets action locales to the default locale when a content type becomes localized', async () => {
      setupStrapi({ withI18n: true });

      await enableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(false) },
        contentTypes: { [UID]: createContentType(true) },
      });

      expect(getDefaultLocale).toHaveBeenCalledTimes(1);
      expectLocaleUpdate('en');
    });

    it('does nothing when localization is unchanged', async () => {
      setupStrapi({ withI18n: true });

      await enableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(false) },
        contentTypes: { [UID]: createContentType(false) },
      });

      expect(getDefaultLocale).not.toHaveBeenCalled();
      expect(queryBuilder).not.toHaveBeenCalled();
    });

    it('does nothing without previous content types', async () => {
      setupStrapi({ withI18n: true });

      await enableContentTypeLocalized({
        oldContentTypes: undefined as unknown as Record<string, Schema.ContentType>,
        contentTypes: { [UID]: createContentType(true) },
      });

      expect(queryBuilder).not.toHaveBeenCalled();
    });

    it('does nothing without a localization plugin', async () => {
      setupStrapi({ withI18n: false });

      await enableContentTypeLocalized({
        oldContentTypes: { [UID]: createContentType(false) },
        contentTypes: { [UID]: createContentType(true) },
      });

      expect(getDefaultLocale).not.toHaveBeenCalled();
      expect(queryBuilder).not.toHaveBeenCalled();
    });
  });
});
