'use strict';

const path = require('path');
const fs = require('fs-extra');
const { produce } = require('immer');
const { getAbsoluteServerUrl } = require('@strapi/utils');
const { builApiEndpointPath, buildComponentSchema } = require('./helpers');

const defaultOpenApiComponents = require('./utils/default-openapi-components');
const { getPluginsThatNeedDocumentation } = require('./utils/get-plugins-that-need-documentation');

module.exports = ({ strapi }) => {
  const config = strapi.config.get('plugin.documentation');
  const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(config);
  const overrideService = strapi.plugin('documentation').service('override');

  return {
    /**
     *
     * @deprecated
     * registerDoc is deprecated it will be removed in the next major release,
     * use strapi.plugin('documentation').service('override').registerOverride() instead
     * @param {object} doc - The openapi specifcation to override
     * @param {object} options - The options to override the documentation
     * @param {string} options.pluginOrigin - The name of the plugin that is overriding the documentation
     * @param {string[]} options.excludeFromGeneration - The name of the plugin that is overriding the documentation
     */
    registerDoc(doc, options) {
      strapi.log.warn(
        "@strapi/plugin-documentation has deprecated registerDoc, use strapi.plugin('documentation').service('override').registerOverride() instead"
      );
      overrideService.registerOverride(doc, options);
    },

    getDocumentationVersion() {
      return config.info.version;
    },

    getFullDocumentationPath() {
      return path.join(strapi.dirs.app.extensions, 'documentation', 'documentation');
    },

    /**
     *
     * @deprecated
     * This method will be removed in the next major release
     */
    getCustomDocumentationPath() {
      return path.join(strapi.dirs.app.extensions, 'documentation', 'config', 'settings.json');
    },

    getDocumentationVersions() {
      return fs
        .readdirSync(this.getFullDocumentationPath())
        .map((version) => {
          try {
            const doc = JSON.parse(
              fs.readFileSync(
                path.resolve(this.getFullDocumentationPath(), version, 'full_documentation.json')
              )
            );

            const generatedDate = doc.info['x-generation-date'];

            return { version, generatedDate, url: '' };
          } catch (err) {
            return null;
          }
        })
        .filter((x) => x);
    },

    /**
     * Returns settings stored in core-store
     */
    async getDocumentationAccess() {
      const { restrictedAccess } = await strapi
        .store({
          environment: '',
          type: 'plugin',
          name: 'documentation',
          key: 'config',
        })
        .get();

      return { restrictedAccess };
    },

    /**
     * @description - Gets the path for an api or plugin
     *
     * @param {object} api
     * @property {string} api.name - Name of the api
     * @property {string} api.getter - api | plugin
     *
     * @returns path to the api | plugin
     */
    getApiDocumentationPath(api) {
      if (api.getter === 'plugin') {
        return path.join(strapi.dirs.app.extensions, api.name, 'documentation');
      }

      return path.join(strapi.dirs.app.api, api.name, 'documentation');
    },

    async deleteDocumentation(version) {
      const apis = this.getPluginAndApiInfo();
      for (const api of apis) {
        await fs.remove(path.join(this.getApiDocumentationPath(api), version));
      }

      await fs.remove(path.join(this.getFullDocumentationPath(), version));
    },

    getPluginAndApiInfo() {
      const pluginsToDocument = pluginsThatNeedDocumentation.map((plugin) => {
        return {
          name: plugin,
          getter: 'plugin',
          ctNames: Object.keys(strapi.plugin(plugin).contentTypes),
        };
      });

      const apisToDocument = Object.keys(strapi.api).map((api) => {
        return {
          name: api,
          getter: 'api',
          ctNames: Object.keys(strapi.api[api].contentTypes),
        };
      });

      return [...apisToDocument, ...pluginsToDocument];
    },

    /**
     * @description - Creates the Swagger json files
     */
    async generateFullDoc(version = this.getDocumentationVersion()) {
      const apis = this.getPluginAndApiInfo();
      const apisThatNeedGeneratedDocumentation = apis.filter(
        ({ name }) => !overrideService.excludedFromGeneration.includes(name)
      );

      // Initialize the generated documentation with defaults
      let generatedDocumentation = produce(
        {
          ...config,
          components: defaultOpenApiComponents,
        },
        (draft) => {
          if (draft.servers.length === 0) {
            // When no servers found set the defaults
            const serverUrl = getAbsoluteServerUrl(strapi.config);
            const apiPath = strapi.config.get('api.rest.prefix');
            draft.servers = [
              {
                url: `${serverUrl}${apiPath}`,
                description: 'Development server',
              },
            ];
          }
          // Set the generated date
          draft.info['x-generation-date'] = new Date().toISOString();
          // Set the plugins that need documentation
          draft['x-strapi-config'].plugins = pluginsThatNeedDocumentation;
          // Delete the mutateDocumentation key from the config so it doesn't end up in the spec
          delete draft['x-strapi-config'].mutateDocumentation;
        }
      );
      // Generate the documentation for each api and update the generatedDocumentation
      for (const api of apisThatNeedGeneratedDocumentation) {
        const apiName = api.name;

        const newApiPath = builApiEndpointPath(api);
        const generatedSchemas = buildComponentSchema(api);

        // TODO: To be confirmed, do we still need to write these files...?
        const apiDirPath = path.join(this.getApiDocumentationPath(api), version);
        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);
        await fs.ensureFile(apiDocPath);
        await fs.writeJson(apiDocPath, newApiPath, { spaces: 2 });

        generatedDocumentation = produce(generatedDocumentation, (draft) => {
          if (generatedSchemas) {
            draft.components.schemas = { ...draft.components.schemas, ...generatedSchemas };
          }

          if (newApiPath) {
            draft.paths = { ...draft.paths, ...newApiPath };
          }
        });
      }

      // When overrides are present update the generatedDocumentation
      if (overrideService.registeredOverrides.length > 0) {
        generatedDocumentation = produce(generatedDocumentation, (draft) => {
          overrideService.registeredOverrides.forEach((override) => {
            // Only run the overrrides when no override version is provided,
            // or when the generated documentation version matches the override version
            if (!override?.info?.version || override.info.version === version) {
              if (override.tags) {
                // Merge override tags with the generated tags
                draft.tags = draft.tags || [];
                draft.tags.push(...override.tags);
              }

              if (override.paths) {
                // Merge override paths with the generated paths
                // The override will add a new path or replace the value of an existing path
                draft.paths = { ...draft.paths, ...override.paths };
              }

              if (override.components) {
                Object.entries(override.components).forEach(([overrideKey, overrideValue]) => {
                  draft.components[overrideKey] = draft.components[overrideKey] || {};
                  // Merge override components with the generated components,
                  // The override will add a new component or replace the value of an existing component
                  draft.components[overrideKey] = {
                    ...draft.components[overrideKey],
                    ...overrideValue,
                  };
                });
              }
            }
          });
        });
      }

      // Escape hatch, allow the user to provide a mutateDocumentation function that can alter any part of
      // the generated documentation before it is written to the file system
      const userMutatesDocumentation = config['x-strapi-config'].mutateDocumentation;
      const finalDocumentation = userMutatesDocumentation
        ? produce(generatedDocumentation, userMutatesDocumentation)
        : generatedDocumentation;

      // Get the file path for the final documentation
      const fullDocJsonPath = path.join(
        this.getFullDocumentationPath(),
        version,
        'full_documentation.json'
      );
      // Write the documentation to the file system
      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, finalDocumentation, { spaces: 2 });
    },
  };
};
