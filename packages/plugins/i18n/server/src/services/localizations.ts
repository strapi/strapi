import { isEmpty } from 'lodash/fp';

import { async } from '@strapi/utils';
import { getService } from '../utils';

const isDialectMySQL = () => strapi.db.dialect.client === 'mysql';

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
    await async.map(
      entry.localizations,
      (localization: any) => updateLocalization(localization.id),
      {
        concurrency: isDialectMySQL() && !strapi.db.inTransaction() ? 1 : Infinity,
      }
    );
  }
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
