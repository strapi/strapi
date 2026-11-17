import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { TEMPLATE_UID } from './constants';

const { ValidationError } = errors;

interface LifecycleEvent {
  params: { data?: { key?: unknown; locale?: unknown }; where?: { id?: number | string } };
}

/**
 * One stored template per key and locale: the service reads a single row for that pair, so a second row would
 * be ignored or picked at random. The database has no composite unique index for it, so a second row is
 * refused here, whichever way it is written.
 */
export const subscribeTemplateLifecycles = (strapi: Core.Strapi) => {
  const query = () => strapi.db.query(TEMPLATE_UID);

  const assertUnique = async (event: LifecycleEvent, isUpdate: boolean) => {
    const { data = {}, where } = event.params;
    const id = isUpdate ? where?.id : undefined;
    let { key, locale } = data;

    if (isUpdate && id !== undefined && (key === undefined || locale === undefined)) {
      const current = await query().findOne({ where: { id } });

      key ??= current?.key;
      locale ??= current?.locale;
    }

    if (typeof key !== 'string') {
      return;
    }

    const duplicate = await query().findOne({
      where: { key, locale: typeof locale === 'string' ? locale : null },
    });

    if (duplicate && String(duplicate.id) !== String(id)) {
      throw new ValidationError(
        `An email template for "${key}" in the "${String(locale)}" locale already exists`
      );
    }
  };

  strapi.db.lifecycles.subscribe({
    models: [TEMPLATE_UID],
    beforeCreate: (event: LifecycleEvent) => assertUnique(event, false),
    beforeUpdate: (event: LifecycleEvent) => assertUnique(event, true),
  });
};
