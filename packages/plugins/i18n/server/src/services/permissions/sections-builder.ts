import { isEmpty } from 'lodash/fp';

import { getService } from '../../utils';

/**
 * Handler for the permissions layout (sections builder)
 * Adds the locales property to the subjects
 * @param {Action} action
 * @param {ContentTypesSection} section
 * @return {Promise<void>}
 */
const localesPropertyHandler = async ({ action, section }: any) => {
  const { actionProvider } = strapi.service('admin::permission');

  const locales = await getService('locales').find();

  // Do not add the locales property if there is none registered
  if (isEmpty(locales)) {
    return;
  }

  for (const subject of section.subjects) {
    const applies = await actionProvider.appliesToProperty('locales', action.actionId, subject.uid);
    const hasLocalesProperty = subject.properties.find(
      (property: any) => property.value === 'locales'
    );

    if (applies && !hasLocalesProperty) {
      subject.properties.push({
        label: 'Locales',
        value: 'locales',
        children: locales.map(({ name, code }: any) => ({ label: name || code, value: code })),
      });
    }
  }
};

const registerLocalesPropertyHandler = () => {
  const { sectionsBuilder } = strapi.service('admin::permission');

  sectionsBuilder.addHandler('singleTypes', localesPropertyHandler);
  sectionsBuilder.addHandler('collectionTypes', localesPropertyHandler);
};

export default {
  localesPropertyHandler,
  registerLocalesPropertyHandler,
};
