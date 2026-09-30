import { isNil } from 'lodash/fp';
import type { Data } from '@strapi/types';
import { emitAudit } from '@strapi/utils';
import type {
  Locale,
  LocaleCreateData,
  LocaleFilters,
  LocaleService,
  LocaleUpdateData,
  WithIsDefault,
} from '../types/services';
import { AUDITED_EVENTS, DEFAULT_LOCALE } from '../constants';
import { getService, getCoreStore } from '../utils';

const find = (params: LocaleFilters = {}): Promise<Locale[]> =>
  strapi.db.query('plugin::i18n.locale').findMany({ where: params });

const findById = (id: Data.ID): Promise<Locale | null> =>
  strapi.db.query('plugin::i18n.locale').findOne({ where: { id } });

const findByCode = (code: string): Promise<Locale | null> =>
  strapi.db.query('plugin::i18n.locale').findOne({ where: { code } });

const count = (params: LocaleFilters = {}): Promise<number> =>
  strapi.db.query('plugin::i18n.locale').count({ where: params });

const create = async (
  locale: LocaleCreateData,
  { isDefault = false }: { isDefault?: boolean } = {}
): Promise<Locale> => {
  const result: Locale = await strapi.db.query('plugin::i18n.locale').create({ data: locale });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  if (result?.id) {
    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_CREATE, {
      localeId: result.id,
      name: result.name,
      code: result.code,
      isDefault,
    });
  }

  return result;
};

const update = async (params: LocaleFilters, updates: LocaleUpdateData): Promise<Locale | null> => {
  const previous: Locale | null = await strapi.db
    .query('plugin::i18n.locale')
    .findOne({ where: params });

  const result: Locale | null = await strapi.db
    .query('plugin::i18n.locale')
    .update({ where: params, data: updates });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  if (result && previous?.name !== result.name) {
    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_UPDATE, {
      localeId: result.id,
      name: result.name,
      code: result.code,
      changes: { name: { before: previous?.name ?? null, after: result.name } },
    });
  }

  return result;
};

const deleteFn = async ({ id }: { id: Data.ID }): Promise<Locale | null> => {
  const localeToDelete = await findById(id);

  if (localeToDelete) {
    await deleteAllLocalizedEntriesFor({ locale: localeToDelete.code });
    const result: Locale | null = await strapi.db
      .query('plugin::i18n.locale')
      .delete({ where: { id } });

    getService('metrics').sendDidUpdateI18nLocalesEvent();

    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_DELETE, {
      localeId: localeToDelete.id,
      name: localeToDelete.name,
      code: localeToDelete.code,
    });

    return result;
  }

  return localeToDelete;
};

const setDefaultLocale = async ({ code }: { code: string }) => {
  const previousCode = await getDefaultLocale();
  const hasChanged = previousCode !== code;

  // Look up the rows before the write: if this fails afterwards, the default is already
  // switched and nothing recorded it.
  const [previous, next] = hasChanged
    ? await Promise.all([previousCode ? findByCode(previousCode) : null, findByCode(code)])
    : [null, null];

  // set() is typed void but resolves to the store row. Returned so callers that used it
  // keep working.
  const result = await getCoreStore().set({ key: 'default_locale', value: code });

  if (hasChanged && next?.id) {
    const before = previousCode ? { id: previous?.id ?? null, code: previousCode } : null;

    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_DEFAULT_UPDATE, {
      localeId: next.id,
      name: next.name,
      code: next.code,
      changes: { defaultLocale: { before, after: { id: next.id, code: next.code } } },
    });
  }

  return result;
};

const getDefaultLocale = () =>
  getCoreStore().get({ key: 'default_locale' }) as Promise<string | null>;

const setIsDefault = async <
  T extends { code: string } | readonly { code: string }[] | null | undefined,
>(
  locales: T
): Promise<WithIsDefault<T>> => {
  if (isNil(locales)) {
    return locales as WithIsDefault<T>;
  }

  const actualDefault = await getDefaultLocale();

  if (Array.isArray(locales)) {
    return locales.map((locale) => ({
      ...locale,
      isDefault: actualDefault === locale.code,
    })) as WithIsDefault<T>;
  }
  // single locale
  const locale = locales as { code: string };
  return { ...locale, isDefault: actualDefault === locale.code } as WithIsDefault<T>;
};

const initDefaultLocale = async () => {
  const existingLocalesNb = await strapi.db.query('plugin::i18n.locale').count();
  if (existingLocalesNb === 0) {
    await create(DEFAULT_LOCALE);
    await setDefaultLocale({ code: DEFAULT_LOCALE.code });
  }
};

const deleteAllLocalizedEntriesFor = async ({ locale }: any) => {
  const { isLocalizedContentType } = getService('content-types');

  const localizedModels = Object.values(strapi.contentTypes).filter(isLocalizedContentType);

  for (const model of localizedModels) {
    // FIXME: delete many content & their associations
    await strapi.db.query(model.uid).deleteMany({ where: { locale } });
  }
};

const locales = () =>
  ({
    find,
    findById,
    findByCode,
    create,
    update,
    count,
    setDefaultLocale,
    getDefaultLocale,
    setIsDefault,
    delete: deleteFn,
    initDefaultLocale,
  }) satisfies LocaleService;

export default locales;
