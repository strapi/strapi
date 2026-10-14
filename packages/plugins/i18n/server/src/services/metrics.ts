import type { Core } from '@strapi/types';
import { getService } from '../utils';

const metrics = ({ strapi }: { strapi: Core.Strapi }) => {
  const sendDidInitializeEvent = async () => {
    const { isLocalizedContentType } = getService('content-types', { strapi });

    // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
    const numberOfContentTypes = Object.values(strapi.contentTypes ?? {}).filter((contentType) =>
      isLocalizedContentType(contentType)
    ).length;

    strapi.telemetry
      .send('didInitializeI18n', { groupProperties: { numberOfContentTypes } })
      .catch(() => {});
  };

  const sendDidUpdateI18nLocalesEvent = async () => {
    const numberOfLocales = await getService('locales', { strapi }).count();

    strapi.telemetry
      .send('didUpdateI18nLocales', {
        groupProperties: { numberOfLocales },
      })
      .catch(() => {});
  };

  return {
    sendDidInitializeEvent,
    sendDidUpdateI18nLocalesEvent,
  };
};

type MetricsService = typeof metrics;

export default metrics;
export type { MetricsService };
