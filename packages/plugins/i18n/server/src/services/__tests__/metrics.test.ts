import metricsLoader from '../metrics';
import contentTypeService from '../content-types';

const { isLocalizedContentType } = contentTypeService();

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
        send: jest.fn(),
      },
    } as any;

    const { sendDidInitializeEvent } = metricsLoader();

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
        send: jest.fn(),
      },
    } as any;

    const { sendDidUpdateI18nLocalesEvent } = metricsLoader();

    await sendDidUpdateI18nLocalesEvent();

    expect(strapi.telemetry.send).toHaveBeenCalledWith('didUpdateI18nLocales', {
      groupProperties: {
        numberOfLocales: 3,
      },
    });
  });
});
