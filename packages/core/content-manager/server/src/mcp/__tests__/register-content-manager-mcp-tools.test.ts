import type { Core } from '@strapi/types';

import { registerContentManagerMcpTools } from '../register-content-manager-mcp-tools';
import { deriveDisplayedContentTypeMcpToolDefinitions } from '../derive-content-type-mcp-tools';

jest.mock('../derive-content-type-mcp-tools', () => ({
  deriveDisplayedContentTypeMcpToolDefinitions: jest.fn(),
}));

const models = [{ uid: 'api::article.article' }];
const findDisplayedContentTypes = jest.fn(() => models);

jest.mock('../../utils', () => ({
  getService: jest.fn((name: string) =>
    name === 'content-types' ? { findDisplayedContentTypes } : undefined
  ),
}));

const deriveMock = jest.mocked(deriveDisplayedContentTypeMcpToolDefinitions);

type LocalizationFixture = {
  defaultLocale: string | null;
  locales: Array<{ code: string; name: string }>;
};

const createStrapi = ({
  mcpEnabled = true,
  localization,
}: {
  mcpEnabled?: boolean;
  localization?: LocalizationFixture;
}) => {
  const registerTool = jest.fn();
  const services: Record<string, unknown> =
    localization === undefined
      ? {}
      : {
          locales: {
            getDefaultLocale: jest.fn(async () => localization.defaultLocale),
            find: jest.fn(async () =>
              localization.locales.map((locale, index) => ({
                id: index + 1,
                ...locale,
                isDefault: locale.code === localization.defaultLocale,
              }))
            ),
          },
        };

  const strapi = {
    ai: { mcp: { isEnabled: jest.fn(() => mcpEnabled), registerTool } },
    plugin: jest.fn((name: string) =>
      name === 'i18n' && localization !== undefined
        ? { service: (serviceName: string) => services[serviceName] }
        : undefined
    ),
  } as unknown as Core.Strapi;

  return { strapi, registerTool };
};

describe('registerContentManagerMcpTools', () => {
  const tools = [{ name: 'list_article' }, { name: 'get_article' }];

  beforeEach(() => {
    jest.clearAllMocks();
    deriveMock.mockReturnValue(tools as unknown as ReturnType<typeof deriveMock>);
  });

  it('skips derivation and registration when MCP is disabled', async () => {
    const { strapi, registerTool } = createStrapi({ mcpEnabled: false });

    await registerContentManagerMcpTools({ strapi });

    expect(deriveMock).not.toHaveBeenCalled();
    expect(registerTool).not.toHaveBeenCalled();
  });

  it('passes null locale codes and default locale without a localization plugin', async () => {
    const { strapi, registerTool } = createStrapi({});

    await registerContentManagerMcpTools({ strapi });

    expect(deriveMock).toHaveBeenCalledWith(strapi, models, {
      localeCodes: null,
      defaultLocale: null,
    });
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registerTool).toHaveBeenNthCalledWith(1, tools[0]);
    expect(registerTool).toHaveBeenNthCalledWith(2, tools[1]);
  });

  it('passes installed locale codes and the default locale with a localization plugin', async () => {
    const { strapi, registerTool } = createStrapi({
      localization: {
        defaultLocale: 'fr',
        locales: [
          { code: 'en', name: 'English (en)' },
          { code: 'fr', name: 'French (fr)' },
        ],
      },
    });

    await registerContentManagerMcpTools({ strapi });

    expect(deriveMock).toHaveBeenCalledWith(strapi, models, {
      localeCodes: ['en', 'fr'],
      defaultLocale: 'fr',
    });
    expect(registerTool).toHaveBeenCalledTimes(2);
  });

  it('passes an empty locale list (not null) when the plugin has no locales', async () => {
    const { strapi } = createStrapi({ localization: { defaultLocale: null, locales: [] } });

    await registerContentManagerMcpTools({ strapi });

    expect(deriveMock).toHaveBeenCalledWith(strapi, models, {
      localeCodes: [],
      defaultLocale: null,
    });
  });
});
