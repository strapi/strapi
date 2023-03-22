'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash/fp');
const { getAbsoluteServerUrl } = require('@strapi/utils');
const { builApiEndpointPath, buildComponentSchema } = require('./helpers');

const defaultOpenApiComponents = require('./utils/default-openapi-components');
const { getPluginsThatNeedDocumentation } = require('./utils/get-plugins-that-need-documentation');

const mutateDocumentation = (currentState, mutateStateCallback) => {
  // Create a copy of the current state that is mutable
  const draftState = _.cloneDeep(currentState);
  // Pass the draft to the callback for mutation
  mutateStateCallback(draftState);
  // Return the mutated state as a new immutable state
  return Object.freeze(draftState);
};

module.exports = ({ strapi }) => {
  const config = strapi.config.get('plugin.documentation');
  const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(config);
  const overrideService = strapi.plugin('documentation').service('override');

  return {
    /**
     *
     * @deprecated
     * registerDoc is deprecated it will be removed in the next major release,
     * use strapi.plugin('documentation').service('override').registerOverride instead
     * @param {object} doc - The openapi specifcation to override
     * @param {object} options - The options to override the documentation
     * @param {string} options.pluginOrigin - The name of the plugin that is overriding the documentation
     * @param {string[]} options.excludeFromGeneration - The name of the plugin that is overriding the documentation
     */
    registerDoc(doc, options) {
      overrideService.registerOverride(doc, options);
    },

    getDocumentationVersion() {
      return _.get('info.version', config);
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

            const generatedDate = _.get(['info', 'x-generation-date'], doc);

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
      let paths = {};
      let schemas = {};
      const apis = this.getPluginAndApiInfo();

      const apisThatNeedGeneratedDocumentation = apis.filter(
        ({ name }) => !overrideService.excludedFromGeneration.includes(name)
      );
      for (const api of apisThatNeedGeneratedDocumentation) {
        const apiName = api.name;

        // TODO: confirm this can be removed
        const apiDirPath = path.join(this.getApiDocumentationPath(api), version);
        // TODO: confirm this can be removed
        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);

        const apiPath = builApiEndpointPath(api);

        if (!apiPath) {
          continue;
        }

        // TODO: confirm this can be removed
        await fs.ensureFile(apiDocPath);
        await fs.writeJson(apiDocPath, apiPath, { spaces: 2 });

        const componentSchema = buildComponentSchema(api);

        schemas = {
          ...schemas,
          ...componentSchema,
        };

        paths = { ...paths, ...apiPath };
      }

      const fullDocJsonPath = path.join(
        this.getFullDocumentationPath(),
        version,
        'full_documentation.json'
      );

      const serverUrl = getAbsoluteServerUrl(strapi.config);
      const apiPath = strapi.config.get('api.rest.prefix');
      const generatedDocumentation = mutateDocumentation(config, (draft) => {
        // When no servers found set the default
        if (draft.servers.length === 0) {
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
        // Delete it from the config so it doesn't end up in the spec
        delete draft['x-strapi-config'].mutateDocumentation;
        // Set the generated paths
        draft.paths = paths;
        // Merge the generated component schemas with the defaults
        draft.components = _.merge(defaultOpenApiComponents, { schemas });
        // Check for overrides and then add them
        if (overrideService.registeredOverrides.length > 0) {
          overrideService.registeredOverrides.forEach((doc) => {
            // Only run the overrrides when no override version is provided,
            // or when the generated documentation version matches the override version
            if (!doc?.info?.version || doc.info.version === version) {
              if (doc.tags) {
                // Merge override tags with the generated tags
                draft.tags = draft.tags || [];
                draft.tags.push(...doc.tags);
              }

              if (doc.paths) {
                // Merge override paths with the generated paths
                // The override will add a new path or replace the value of an existing path
                draft.paths = { ...draft.paths, ...doc.paths };
              }

              if (doc.components) {
                Object.entries(doc.components).forEach(([key, val]) => {
                  draft.components[key] = draft.components[key] || {};
                  // Merge override components with the generated components,
                  // The override will add a new component or replace the value of an existing component
                  draft.components[key] = { ...draft.components[key], ...val };
                });
              }
            }
          });
        }
      });
      // Get the documentation mutateDocumentation
      const userMutateCallback = config['x-strapi-config'].mutateDocumentation;
      // Escape hatch, allow the user to provide a mutateDocumentation function that can alter any part of
      // the generated documentation before it is written to the file system
      const finalDocumentation = userMutateCallback
        ? mutateDocumentation(generatedDocumentation, userMutateCallback)
        : generatedDocumentation;

      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, finalDocumentation, { spaces: 2 });
    },
  };
};
