import type { Core } from '@strapi/types';

import metricsLoader from '../metrics';
import contentTypeService from '../content-types';

type Deps = { strapi: Core.Strapi };

// Typed with the `{ strapi }` argument core passes to service factories.
const createMetrics: (deps: Deps) => ReturnType<typeof metricsLoader> = metricsLoader;
const createContentTypes: (deps: Deps) => ReturnType<typeof contentTypeService> =
  contentTypeService;

const { isLocalizedContentType } = createContentTypes({ strapi: {} as Core.Strapi });

describe('Metrics', () => {
  test('sendDidInitializeEvent', async () => {
    global.strapi = {
      contentTypes: {
        withI18n: {
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
        },
        withoutI18n: {
          pluginOptions: {
            i18n: {
              localized: false,
            },
          },
        },
        withNoOption: {
          pluginOptions: {},
        },
      },
      plugins: {
        i18n: {
          services: {
            'content-types': {
              isLocalizedContentType,
            },
          },
        },
      },
      telemetry: {
        send: jest.fn().mockResolvedValue(true),
      },
    } as any;

    const { sendDidInitializeEvent } = createMetrics({ strapi: global.strapi });

    await sendDidInitializeEvent();

    expect(strapi.telemetry.send).toHaveBeenCalledWith('didInitializeI18n', {
      groupProperties: {
        numberOfContentTypes: 1,
      },
    });
  });

  test('sendDidUpdateI18nLocalesEvent', async () => {
    global.strapi = {
      contentTypes: {
        withI18n: {
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
        },
        withoutI18n: {
          pluginOptions: {
            i18n: {
              localized: false,
            },
          },
        },
        withNoOption: {
          pluginOptions: {},
        },
      },
      plugins: {
        i18n: {
          services: {
            locales: {
              count: jest.fn(() => 3),
            },
          },
        },
      },
      telemetry: {
        send: jest.fn().mockResolvedValue(true),
      },
    } as any;

    const { sendDidUpdateI18nLocalesEvent } = createMetrics({ strapi: global.strapi });

    await sendDidUpdateI18nLocalesEvent();

    expect(strapi.telemetry.send).toHaveBeenCalledWith('didUpdateI18nLocales', {
      groupProperties: {
        numberOfLocales: 3,
      },
    });
  });
});
