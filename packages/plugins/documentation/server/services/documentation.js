'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { getAbsoluteServerUrl } = require('@strapi/utils');

const defaultPluginConfig = require('../config/default-plugin-config');
const { builApiEndpointPath, buildComponentSchema } = require('./helpers');

module.exports = ({ strapi }) => {
  const config = strapi.config.get('plugin.documentation');

  const registeredDocs = [];

  return {
    registerDoc(doc) {
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

    getCustomDocumentationPath() {
      // ??
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
      const plugins = _.get(config, 'x-strapi-config.plugins');
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

    async getCustomConfig() {
      const customConfigPath = this.getCustomDocumentationPath();
      const pathExists = await fs.pathExists(customConfigPath);
      if (pathExists) {
        return fs.readJson(customConfigPath);
      }

      return {};
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
        const apiDirPath = path.join(this.getApiDocumentationPath(api), version);

        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);

        const apiPath = builApiEndpointPath(api);

        if (!apiPath) {
          continue;
        }

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

      const defaultConfig = _.cloneDeep(defaultPluginConfig);

      const serverUrl = getAbsoluteServerUrl(strapi.config);
      const apiPath = strapi.config.get('api.rest.prefix');

      _.set(defaultConfig, 'servers', [
        {
          url: `${serverUrl}${apiPath}`,
          description: 'Development server',
        },
      ]);
      _.set(defaultConfig, ['info', 'x-generation-date'], new Date().toISOString());
      _.set(defaultConfig, ['info', 'version'], version);
      _.merge(defaultConfig.components, { schemas });

      const customConfig = await this.getCustomConfig();
      const config = _.merge(defaultConfig, customConfig);

      const finalDoc = { ...config, paths };

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
