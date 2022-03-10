'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { getAbsoluteServerUrl } = require('@strapi/utils');

const { builApiEndpointPath } = require('../utils/builders');
const defaultConfig = require('../config/default-config');

module.exports = ({ strapi }) => {
  const config = strapi.config.get('plugin.documentation');

  return {
    getDocumentationVersion() {
      return _.get(config, 'info.version');
    },

    getFullDocumentationPath() {
      return path.join(strapi.dirs.extensions, 'documentation', 'documentation');
    },

    getCustomDocumentationPath() {
      return path.join(strapi.dirs.extensions, 'documentation', 'config', 'settings.json');
    },

    getDocumentationVersions() {
      return fs
        .readdirSync(this.getFullDocumentationPath())
        .map(version => {
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
        .filter(x => x);
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
        return path.join(strapi.dirs.extensions, api.name, 'documentation');
      }

      return path.join(strapi.dirs.api, api.name, 'documentation');
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
      const pluginsToDocument = plugins.map(plugin => {
        return {
          name: plugin,
          getter: 'plugin',
          ctNames: Object.keys(strapi.plugin(plugin).contentTypes),
        };
      });

      const apisToDocument = Object.keys(strapi.api).map(api => {
        return {
          name: api,
          getter: 'api',
          ctNames: Object.keys(strapi.api[api].contentTypes),
        };
      });

      return [...apisToDocument, ...pluginsToDocument];
    },

    async getCustomSettings() {
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

      const apis = this.getPluginAndApiInfo();
      for (const api of apis) {
        const apiName = api.name;
        const apiDirPath = path.join(this.getApiDocumentationPath(api), version);

        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);
        const apiPathsObject = builApiEndpointPath(api);

        if (!apiPathsObject) {
          continue;
        }

        await fs.ensureFile(apiDocPath);
        await fs.writeJson(apiDocPath, apiPathsObject, { spaces: 2 });

        paths = { ...paths, ...apiPathsObject.paths };
      }

      const fullDocJsonPath = path.join(
        this.getFullDocumentationPath(),
        version,
        'full_documentation.json'
      );

      const defaultSettings = _.cloneDeep(defaultConfig);

      const serverUrl = getAbsoluteServerUrl(strapi.config);
      const apiPath = strapi.config.get('api.rest.prefix');

      _.set(defaultSettings, 'servers', [
        {
          url: `${serverUrl}${apiPath}`,
          description: 'Development server',
        },
      ]);

      _.set(defaultSettings, ['info', 'x-generation-date'], new Date().toISOString());
      _.set(defaultSettings, ['info', 'version'], version);

      const customSettings = await this.getCustomSettings();

      const settings = _.merge(defaultSettings, customSettings);

      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, { ...settings, paths }, { spaces: 2 });
    },
  };
};
