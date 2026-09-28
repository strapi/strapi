/**
 * An Enterprise plugin as shown by `strapi enterprise install`. The registry decides whether a
 * license may install it, and provides its name and copy from the plugin's own `strapi` metadata.
 */
export interface EnterprisePluginCatalogEntry {
  packageName: string;
  /** The plugin's key in `config/plugins`. */
  pluginId: string;
  displayName: string;
  summary: string;
  configuration?: {
    pluginConfig: string;
    envLines: string[];
  };
}

/**
 * The Enterprise plugins this CLI already knows. They hold the configuration to print after an
 * install, which a package does not publish, and they stay listed when the registry search is
 * unavailable. Any other plugin the license includes is found through the registry search.
 */
export const enterprisePluginCatalog: EnterprisePluginCatalogEntry[] = [
  {
    packageName: '@strapi-enterprise/plugin-ai-byok',
    pluginId: 'ai-byok',
    displayName: 'AI BYOK',
    summary: 'Runs Strapi AI features with a customer-owned provider key.',
    configuration: {
      pluginConfig: [
        `'ai-byok': {`,
        `  enabled: env.bool('STRAPI_AI_BYOK_ENABLED', false),`,
        `  config: {`,
        `    connection: {`,
        `      apiKey: env('STRAPI_AI_PROVIDER_API_KEY'),`,
        `      baseURL: env('STRAPI_AI_PROVIDER_BASE_URL'),`,
        `    },`,
        `    models: {`,
        `      translations: env('STRAPI_AI_TRANSLATIONS_MODEL'),`,
        `      mediaMetadata: env('STRAPI_AI_MEDIA_METADATA_MODEL'),`,
        `    },`,
        `  },`,
        `},`,
      ].join('\n'),
      envLines: [
        'STRAPI_AI_BYOK_ENABLED=true',
        'STRAPI_AI_PROVIDER_BASE_URL=',
        'STRAPI_AI_PROVIDER_API_KEY=',
        'STRAPI_AI_TRANSLATIONS_MODEL=',
        'STRAPI_AI_MEDIA_METADATA_MODEL=',
      ],
    },
  },
];

export const findCatalogEntry = (packageName: string): EnterprisePluginCatalogEntry | undefined =>
  enterprisePluginCatalog.find((entry) => entry.packageName === packageName);
