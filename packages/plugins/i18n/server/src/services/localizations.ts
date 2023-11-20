import { prop, isNil, isEmpty, isArray } from 'lodash/fp';

import { mapAsync } from '@strapi/utils';
import { getService } from '../utils';

const isDialectMySQL = () => strapi.db.dialect.client === 'mysql';

/**
 * Adds the default locale to an object if it isn't defined yet
 * @param {Object} data a data object before being persisted into db
 */
const assignDefaultLocaleToEntries = async (data: any) => {
  const { getDefaultLocale } = getService('locales');

  if (isArray(data) && data.some((entry) => !entry.locale)) {
    const defaultLocale = await getDefaultLocale();
    data.forEach((entry) => {
      entry.locale = entry.locale || defaultLocale;
    });
  } else if (!isArray(data) && isNil(data.locale)) {
    data.locale = await getDefaultLocale();
  }
};

/**
 * Synchronize related localizations from a root one
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const syncLocalizations = async (entry: any, { model }: any) => {
  if (Array.isArray(entry?.localizations)) {
    const newLocalizations = [entry.id, ...entry.localizations.map(prop('id'))];

    const updateLocalization = (id: any) => {
      const localizations = newLocalizations.filter((localizationId) => localizationId !== id);

      return strapi.query(model.uid).update({ where: { id }, data: { localizations } });
    };

    // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
    // TODO: use a transaction to avoid deadlocks
    await mapAsync(
      entry.localizations,
      (localization: any) => updateLocalization(localization.id),
      {
        concurrency: isDialectMySQL() && !strapi.db.inTransaction() ? 1 : Infinity,
      }
    );
  }
};

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const syncNonLocalizedAttributes = async (entry: any, { model }: any) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  if (Array.isArray(entry?.localizations)) {
    const nonLocalizedAttributes = copyNonLocalizedAttributes(model, entry);

    if (isEmpty(nonLocalizedAttributes)) {
      return;
    }

    const updateLocalization = (id: any) => {
      return strapi.entityService.update(model.uid, id, { data: nonLocalizedAttributes });
    };

    // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
    // TODO: use a transaction to avoid deadlocks
    await mapAsync(
      entry.localizations,
      (localization: any) => updateLocalization(localization.id),
      {
        concurrency: isDialectMySQL() && !strapi.db.inTransaction() ? 1 : Infinity,
      }
    );
  }
};

const localizations = () => ({
  assignDefaultLocaleToEntries,
  syncLocalizations,
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
