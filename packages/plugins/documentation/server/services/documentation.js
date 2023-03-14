'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { getAbsoluteServerUrl } = require('@strapi/utils');

const { builApiEndpointPath, buildComponentSchema } = require('./helpers');

const defaultOpenApiComponents = require('./utils/default-openapi-components');

module.exports = ({ strapi }) => {
  const config = strapi.config.get('plugin.documentation');
  const registeredDocs = [];

  return {
    registerDoc(doc, pluginOrigin) {
      const plugins = this.getPluginsThatNeedDocumentation();
      if (pluginOrigin) {
        if (!plugins.includes(pluginOrigin)) {
          return strapi.log.info(
            `@strapi/documentation will not use the override provided by ${pluginOrigin} since the plugin was not specified in the x-strapi-config.plugins array`
          );
        }
      } else {
        strapi.log.warn(
          '@strapi/documentation received an override that did not specify its origin, this could cause unexpected schema generation'
        );
      }

      let registeredDoc = doc;
      // parseYaml
      if (typeof doc === 'string') {
        registeredDoc = require('yaml').parse(registeredDoc);
      }
      // receive an object we can register it directly
      registeredDocs.push(registeredDoc);
    },
    getDocumentationVersion() {
      return _.get(config, 'info.version');
    },

    getFullDocumentationPath() {
      return path.join(strapi.dirs.app.extensions, 'documentation', 'documentation');
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
            const generatedDate = _.get(doc, ['info', 'x-generation-date'], null);

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

    getPluginsThatNeedDocumentation() {
      // Default plugins that need documentation generated
      const defaultPlugins = ['email', 'upload', 'users-permissions'];
      // User specified plugins that need documentation generated
      const userPluginsConfig = _.get(config, 'x-strapi-config.plugins');

      if (userPluginsConfig === null) {
        // The user hasn't specified any plugins to document, use the defaults
        return defaultPlugins;
      }

      if (userPluginsConfig.length) {
        // The user has specified certain plugins to document, use them
        return userPluginsConfig;
      }

      // The user has specified that no plugins should be documented
      return [];
    },

    getPluginAndApiInfo() {
      const plugins = this.getPluginsThatNeedDocumentation();
      const pluginsToDocument = plugins.map((plugin) => {
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
      for (const api of apis) {
        const apiName = api.name;
        // TODO: check if this is necessary
        const apiDirPath = path.join(this.getApiDocumentationPath(api), version);
        // TODO: check if this is necessary
        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);

        const apiPath = builApiEndpointPath(api);

        if (!apiPath) {
          continue;
        }

        // TODO: check if this is necessary
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

      // Set config defaults
      const serverUrl = getAbsoluteServerUrl(strapi.config);
      const apiPath = strapi.config.get('api.rest.prefix');
      _.set(config, 'servers', [
        {
          url: `${serverUrl}${apiPath}`,
          description: 'Development server',
        },
      ]);
      _.set(config, ['info', 'x-generation-date'], new Date().toISOString());
      _.set(config, ['info', 'version'], version);
      // Prepare final doc with default config and generated paths
      const finalDoc = { ...config, paths };
      // Add the default components to the final doc
      _.set(finalDoc, 'components', defaultOpenApiComponents);
      // Merge the generated component schemas with the defaults
      _.merge(finalDoc.components, { schemas });
      // Apply the the registered overrides
      registeredDocs.forEach((doc) => {
        // Add tags
        finalDoc.tags = finalDoc.tags || [];
        finalDoc.tags.push(...(doc.tags || []));
        // Add Paths
        _.assign(finalDoc.paths, doc.paths);
        // Add components
        _.forEach(doc.components || {}, (val, key) => {
          finalDoc.components[key] = finalDoc.components[key] || {};

          _.assign(finalDoc.components[key], val);
        });
      });

      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, finalDoc, { spaces: 2 });
    },
  };
};
