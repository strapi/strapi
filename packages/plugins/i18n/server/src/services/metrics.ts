import { reduce } from 'lodash/fp';
import { getService } from '../utils';

const sendDidInitializeEvent = async () => {
  const { isLocalizedContentType } = getService('content-types');

  // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
  const numberOfContentTypes = reduce(
    (sum, contentType) => (isLocalizedContentType(contentType) ? sum + 1 : sum),
    0
  )(strapi.contentTypes as any);

  await strapi.telemetry.send('didInitializeI18n', { groupProperties: { numberOfContentTypes } });
};

const sendDidUpdateI18nLocalesEvent = async () => {
  const numberOfLocales = await getService('locales').count();

  await strapi.telemetry.send('didUpdateI18nLocales', {
    groupProperties: { numberOfLocales },
  });
};

const metrics = () => ({
  sendDidInitializeEvent,
  sendDidUpdateI18nLocalesEvent,
});

type MetricsService = typeof metrics;

export default metrics;
export type { MetricsService };
