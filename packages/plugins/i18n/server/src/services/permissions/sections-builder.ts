import type { Core } from '@strapi/types';
import { isEmpty } from 'lodash';

import { getService } from '../../utils';

// TODO @Nico `localesPropertyHandler` is registered into the admin sections builder, which admin
// keeps at module level and never clears: it outlives a Strapi instance. It reads the global
// `strapi` at call time, so a handler registered by a destroyed instance serves the one that booted
// after it in the same process (see __tests__/cross-instance-hooks.test.ts).

/**
 * Handler for the permissions layout (sections builder)
 * Adds the locales property to the subjects
 * @param {Action} action
 * @param {ContentTypesSection} section
 * @return {Promise<void>}
 */
const localesPropertyHandler = async ({ action, section }: any) => {
  const { actionProvider } = strapi.service('admin::permission');

  const localesService = getService('locales', { strapi });
  const locales = await localesService.setIsDefault(await localesService.find());

  // Do not add the locales property if there is none registered
  if (isEmpty(locales)) {
    return;
  }

  for (const subject of section.subjects) {
    const applies = await actionProvider.appliesToProperty('locales', action.actionId, subject.uid);
    const hasLocalesProperty = subject.properties.some(
      (property: any) => property.value === 'locales'
    );

    if (applies && !hasLocalesProperty) {
      subject.properties.push({
        label: 'Locales',
        value: 'locales',
        children: locales.map(({ name, code, isDefault }: any) => ({
          label: name || code,
          value: code,
          isDefault,
        })),
      });
    }
  }
};

const createSectionsBuilderService = ({ strapi }: { strapi: Core.Strapi }) => {
  const registerLocalesPropertyHandler = () => {
    const { sectionsBuilder } = strapi.service('admin::permission');

    sectionsBuilder.addHandler('singleTypes', localesPropertyHandler);
    sectionsBuilder.addHandler('collectionTypes', localesPropertyHandler);
  };

  return {
    localesPropertyHandler,
    registerLocalesPropertyHandler,
  };
};

export default createSectionsBuilderService;
