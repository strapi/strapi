'use strict';
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

const { builApiEndpointPath } = require('../utils/builders');
const defaultConfig = require('../config/default-config');
const form = require('./utils/forms');

module.exports = () => {
  const docPlugin = strapi.plugin('documentation');

  return {
    getMergedDocumentationPath(version = this.getDocumentationVersion()) {
      return path.join(
        strapi.config.appPath,
        'src',
        'extensions',
        'documentation',
        'documentation',
        version
      );
    },

    getDocumentationVersion() {
      return docPlugin.config('info.version');
    },

    getFullDocumentationPath() {
      return path.join(
        strapi.config.appPath,
        'src',
        'extensions',
        'documentation',
        'documentation'
      );
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

    async getFrontendForm() {
      const config = await strapi
        .store({
          environment: '',
          type: 'plugin',
          name: 'documentation',
          key: 'config',
        })
        .get();

      const forms = JSON.parse(JSON.stringify(form));

      _.set(forms, [0, 0, 'value'], config.restrictedAccess);
      _.set(forms, [0, 1, 'value'], config.password || '');

      return forms;
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
        return path.join(strapi.config.appPath, 'src', 'extensions', api.name, 'documentation');
      }

      return path.join(strapi.config.appPath, 'src', 'api', api.name, 'documentation');
    },

    async deleteDocumentation(version) {
      const apis = this.getPluginAndApiInfo();
      for (const api of apis) {
        await fs.remove(path.join(this.getApiDocumentationPath(api), version));
      }

      await fs.remove(path.join(this.getFullDocumentationPath(), version));
    },

    getPluginAndApiInfo() {
      const plugins = docPlugin.config('x-strapi-config.plugins');
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

    /**
     * @description - Creates the Swagger json files
     */
    async generateFullDoc() {
      let paths = {};

      const apis = this.getPluginAndApiInfo();
      for (const api of apis) {
        const apiName = api.name;
        const apiDirPath = path.join(
          this.getApiDocumentationPath(api),
          this.getDocumentationVersion()
        );

        const apiDocPath = path.join(apiDirPath, `${apiName}.json`);

        await fs.ensureFile(apiDocPath);
        const apiPathsObject = builApiEndpointPath(api);

        await fs.writeJson(apiDocPath, apiPathsObject, { spaces: 2 });
        paths = { ...paths, ...apiPathsObject.paths };
      }

      const fullDocJsonPath = path.join(
        this.getFullDocumentationPath(),
        this.getDocumentationVersion(),
        'full_documentation.json'
      );

      await fs.ensureFile(fullDocJsonPath);
      await fs.writeJson(fullDocJsonPath, { ...defaultConfig, paths }, { spaces: 2 });
    },
  };
};
