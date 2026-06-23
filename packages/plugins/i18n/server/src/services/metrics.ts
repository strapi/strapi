import fp from 'lodash/fp.js';
import { getService } from '../utils';

const { reduce } = fp;

const sendDidInitializeEvent = async () => {
  const { isLocalizedContentType } = getService('content-types');

  // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
  const numberOfContentTypes = reduce(
    (sum, contentType) => (isLocalizedContentType(contentType) ? sum + 1 : sum),
    0
  )(strapi.contentTypes as any);

  strapi.telemetry
    .send('didInitializeI18n', { groupProperties: { numberOfContentTypes } })
    .catch(() => {});
};

const sendDidUpdateI18nLocalesEvent = async () => {
  const numberOfLocales = await getService('locales').count();

  strapi.telemetry
    .send('didUpdateI18nLocales', {
      groupProperties: { numberOfLocales },
    })
    .catch(() => {});
};

const metrics = () => ({
  sendDidInitializeEvent,
  sendDidUpdateI18nLocalesEvent,
});

type MetricsService = typeof metrics;

export default metrics;
export type { MetricsService };
