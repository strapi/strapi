'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { getAbsoluteServerUrl } = require('@strapi/utils');

const { builApiEndpointPath, buildComponentSchema } = require('./helpers');

const defaultOpenApiComponents = require('./utils/default-openapi-components');
const { getPluginsThatNeedDocumentation } = require('./utils/get-plugins-that-need-documentation');

module.exports = ({ strapi }) => {
  console.log('documentation arg', strapi.config.get());
  const config = strapi.config.get('plugin.documentation');
  const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(config);

  const overrideService = strapi.plugin('documentation').service('override');

  return {
    /**
     * @TODO: Make both parameters required in next major release
     * @param {*} doc - The openapi specifcation to override
     * @param {*} pluginOrigin - The name of the plugin that is overriding the documentation
     */
    registerDoc(doc, pluginOrigin) {
      overrideService.registerDoc(doc, pluginOrigin);
    },

    getDocumentationVersion() {
      return _.get(config, 'info.version');
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
      _.set(config, ['x-strapi-config', 'plugins'], pluginsThatNeedDocumentation);
      // Prepare final doc with default config and generated paths
      const finalDoc = { ...config, paths };
      // Add the default components to the final doc
      _.set(finalDoc, 'components', defaultOpenApiComponents);
      // Merge the generated component schemas with the defaults
      _.merge(finalDoc.components, { schemas });
      // Apply the the registered overrides
      overrideService.registeredDocs.forEach((doc) => {
        // Merge ovveride tags with the generated tags
        finalDoc.tags = finalDoc.tags || [];
        finalDoc.tags.push(...(doc.tags || []));
        // Merge override paths with the generated paths
        // The override will add a new path or replace the value of an existing path
        _.assign(finalDoc.paths, doc.paths);
        // Add components
        _.forEach(doc.components || {}, (val, key) => {
          finalDoc.components[key] = finalDoc.components[key] || {};
          // Merge override components with the generated components,
          // The override will add a new component or replace the value of an existing component
          _.assign(finalDoc.components[key], val);
        });
      });

      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, finalDoc, { spaces: 2 });
    },
  };
};
