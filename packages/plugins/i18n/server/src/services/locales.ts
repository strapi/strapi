import { isNil } from 'lodash/fp';
import { emitAudit } from '@strapi/utils';
import { AUDITED_EVENTS, DEFAULT_LOCALE } from '../constants';
import { getService, getCoreStore } from '../utils';

const find = (params: any = {}) =>
  strapi.db.query('plugin::i18n.locale').findMany({ where: params });

const findById = (id: any) => strapi.db.query('plugin::i18n.locale').findOne({ where: { id } });

const findByCode = (code: any) =>
  strapi.db.query('plugin::i18n.locale').findOne({ where: { code } });

const count = (params: any = {}) => strapi.db.query('plugin::i18n.locale').count({ where: params });

const create = async (locale: any, { isDefault = false }: { isDefault?: boolean } = {}) => {
  const result = await strapi.db.query('plugin::i18n.locale').create({ data: locale });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  if (result?.id) {
    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_CREATE, {
      localeId: result.id,
      name: result.name,
      isDefault,
    });
  }

  return result;
};

const update = async (params: any, updates: any) => {
  const previous = await strapi.db.query('plugin::i18n.locale').findOne({ where: params });

  const result = await strapi.db
    .query('plugin::i18n.locale')
    .update({ where: params, data: updates });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  if (result && previous?.name !== result.name) {
    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_UPDATE, {
      localeId: result.id,
      name: result.name,
      changes: { name: { before: previous?.name ?? null, after: result.name } },
    });
  }

  return result;
};

const deleteFn = async ({ id }: any) => {
  const localeToDelete = await findById(id);

  if (localeToDelete) {
    await deleteAllLocalizedEntriesFor({ locale: localeToDelete.code });
    const result = await strapi.db.query('plugin::i18n.locale').delete({ where: { id } });

    getService('metrics').sendDidUpdateI18nLocalesEvent();

    await emitAudit({ strapi }, AUDITED_EVENTS.LOCALE_DELETE, {
      localeId: localeToDelete.id,
      name: localeToDelete.name,
    });

    return result;
  }

  return localeToDelete;
};

const setDefaultLocale = async ({ code }: any) => {
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
      changes: { defaultLocale: { before, after: { id: next.id, code: next.code } } },
    });
  }

  return result;
};

const getDefaultLocale = () => getCoreStore().get({ key: 'default_locale' });

const setIsDefault = async (locales: any) => {
  if (isNil(locales)) {
    return locales;
  }

  const actualDefault = await getDefaultLocale();

  if (Array.isArray(locales)) {
    return locales.map((locale) => ({ ...locale, isDefault: actualDefault === locale.code }));
  }
  // single locale
  return { ...locales, isDefault: actualDefault === locales.code };
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

const locales = () => ({
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
});

type LocaleService = typeof locales;

export default locales;
export type { LocaleService };
