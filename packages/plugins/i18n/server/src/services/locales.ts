import { isNil } from 'lodash/fp';
import { DEFAULT_LOCALE } from '../constants';
import { getService, getCoreStore } from '../utils';

/**
 * Extension point: a plugin (e.g. `@strapi/plugin-spaces`) can replace how the
 * default locale is resolved/persisted by installing a strategy. All three internal
 * consumers (`getDefaultLocale`, `setDefaultLocale`, `setIsDefault`) route through
 * it, so module-local calls inside this service observe the override too — a plain
 * service-method monkey-patch would miss them.
 *
 * `listDefaults` (optional) enumerates the effective default locale per scope
 * (e.g. per space slug); when provided, `setIsDefault` attaches an
 * `isDefaultIn: string[]` array to each locale row for the admin UI.
 */
interface DefaultLocaleStrategy {
  get(): Promise<string | null | undefined>;
  set(code: string): Promise<void>;
  listDefaults?(): Promise<Record<string, string>>;
}

let defaultLocaleStrategy: DefaultLocaleStrategy | null = null;

const setDefaultLocaleStrategy = (strategy: DefaultLocaleStrategy | null) => {
  defaultLocaleStrategy = strategy;
};

const find = (params: any = {}) =>
  strapi.db.query('plugin::i18n.locale').findMany({ where: params });

const findById = (id: any) => strapi.db.query('plugin::i18n.locale').findOne({ where: { id } });

const findByCode = (code: any) =>
  strapi.db.query('plugin::i18n.locale').findOne({ where: { code } });

const count = (params: any = {}) => strapi.db.query('plugin::i18n.locale').count({ where: params });

const create = async (locale: any) => {
  const result = await strapi.db.query('plugin::i18n.locale').create({ data: locale });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  return result;
};

const update = async (params: any, updates: any) => {
  const result = await strapi.db
    .query('plugin::i18n.locale')
    .update({ where: params, data: updates });

  getService('metrics').sendDidUpdateI18nLocalesEvent();

  return result;
};

const deleteFn = async ({ id }: any) => {
  const localeToDelete = await findById(id);

  if (localeToDelete) {
    await deleteAllLocalizedEntriesFor({ locale: localeToDelete.code });
    const result = await strapi.db.query('plugin::i18n.locale').delete({ where: { id } });

    getService('metrics').sendDidUpdateI18nLocalesEvent();

    return result;
  }

  return localeToDelete;
};

const setDefaultLocale = ({ code }: any) =>
  defaultLocaleStrategy
    ? defaultLocaleStrategy.set(code)
    : getCoreStore().set({ key: 'default_locale', value: code });

const getDefaultLocale = () =>
  defaultLocaleStrategy
    ? defaultLocaleStrategy.get()
    : getCoreStore().get({ key: 'default_locale' });

const setIsDefault = async (locales: any) => {
  if (isNil(locales)) {
    return locales;
  }

  if (defaultLocaleStrategy) {
    const strategy = defaultLocaleStrategy;
    // Resolve ONCE for the whole list: a per-row `isDefault(code)` check would
    // repeat the same store reads and locale-list query for every row
    // (O(rows × queries) on each GET /i18n/locales), while `get()` follows the
    // exact same resolution (per-scope override → platform default → first
    // visible locale), so `isDefault ≡ get() === code`.
    const [effectiveDefault, defaultsByScope] = await Promise.all([
      strategy.get(),
      strategy.listDefaults?.() ?? null,
    ]);

    const decorate = (locale: any) => ({
      ...locale,
      isDefault: effectiveDefault === locale.code,
      ...(defaultsByScope
        ? {
            isDefaultIn: Object.entries(defaultsByScope)
              .filter(([, code]) => code === locale.code)
              .map(([scope]) => scope),
          }
        : {}),
    });

    return Array.isArray(locales) ? locales.map(decorate) : decorate(locales);
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
  setDefaultLocaleStrategy,
  setIsDefault,
  delete: deleteFn,
  initDefaultLocale,
});

type LocaleService = typeof locales;

export default locales;
export type { LocaleService, DefaultLocaleStrategy };
