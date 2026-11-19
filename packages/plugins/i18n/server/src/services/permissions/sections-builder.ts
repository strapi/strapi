import { isEmpty } from 'lodash';
import type { Core } from '@strapi/types';

import { getService } from '../../utils';

/**
 * What the handler reads from a content-types section: each subject's UID and properties, to which
 * it adds the locales property (admin `shared/contracts/permissions.ts` `Subject`).
 */
type LocalesSectionContext = {
  action: { actionId: string };
  section: {
    subjects: {
      uid: string;
      properties: { label: string; value: string; children?: unknown[] }[];
    }[];
  };
};

/**
 * The handler's context. Exported so that the declaration emitter references the gate from the
 * `permissions` service instead of resolving it with strict types off.
 */
export type LocalesPropertyHandlerContext = Core.IsStrict extends true
  ? LocalesSectionContext
  : any;

/**
 * Handler for the permissions layout (sections builder)
 * Adds the locales property to the subjects
 * @param {Action} action
 * @param {ContentTypesSection} section
 * @return {Promise<void>}
 */
const localesPropertyHandler = async ({ action, section }: LocalesPropertyHandlerContext) => {
  const { actionProvider } = strapi.service('admin::permission');

  const localesService = getService('locales');
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

const registerLocalesPropertyHandler = () => {
  const { sectionsBuilder } = strapi.service('admin::permission');

  sectionsBuilder.addHandler('singleTypes', localesPropertyHandler);
  sectionsBuilder.addHandler('collectionTypes', localesPropertyHandler);
};

export default {
  localesPropertyHandler,
  registerLocalesPropertyHandler,
};
