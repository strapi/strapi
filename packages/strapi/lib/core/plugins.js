'use strict';

// Dependencies.
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

module.exports = function() {
  return new Promise((resolve, reject) => {
    const folder = (() => {
      if (_.get(strapi.config.currentEnvironment.server, 'admin.folder')) {
        // Relative URL
        if (strapi.config.currentEnvironment.server.admin.folder[0] === '/') {
          return strapi.config.currentEnvironment.server.admin.folder.substring(1);
        }

        return strapi.config.currentEnvironment.server.admin.folder;
      }

      return 'admin';
    })();

    const configuratePlugin = (acc, current, source, x) => {
      switch (source) {
        case 'remote':
          if (!_.get(this.config.environments[current].server, 'admin.remoteURL')) {
            throw new Error(`You can't use \`remote\` as a source without set the \`remoteURL\` configuration.`);
          }

          const subFolder = _.get(this.config.environments[current].server, 'admin.plugins.subFolder', null);

          if (_.isString(subFolder)) {
            const cleanSubFolder = subFolder[0] === '/' ? subFolder.substring(1) : subFolder;

            return `${this.config.environments[current].server.admin.remoteURL}/${cleanSubFolder}/${x}/main.js`;
          }

          return `${this.config.environments[current].server.admin.remoteURL}/${x}/main.js`;
        case 'custom':
          if (!_.isEmpty(_.get(this.plugins[x].config, `sources.${current}`, {}))) {
            return acc[current] = this.plugins[x].config.sources[current];
          }

          throw new Error(`You have to define the source URL for each environment in \`./plugins/**/config/sources.json\``);
        case 'origin':
        default:
          return `http://${this.config.environments[current].server.host}:${this.config.environments[current].server.port}/${folder}/${x}/main.js`;
      }
    };

    const sourcePath = process.env.NODE_ENV !== 'test' ?
      path.resolve(this.config.appPath, folder, 'admin', 'src', 'config', 'plugins.json'):
      path.resolve(this.config.appPath, 'packages', 'strapi-admin', 'admin', 'src', 'config', 'plugins.json');
    const buildPath = process.env.NODE_ENV !== 'test' ?
      path.resolve(this.config.appPath, folder, 'admin', 'build', 'config', 'plugins.json'):
      path.resolve(this.config.appPath, 'packages', 'strapi-admin', 'admin', 'build', 'config', 'plugins.json');

    try {
      fs.access(path.resolve(this.config.appPath, folder, 'admin'), err => {
        if (err && err.code !== 'ENOENT') {
          return reject(err);
        }

        // No admin.
        if (err && err.code === 'ENOENT') {
          return resolve();
        }

        // Try to access to path.
        fs.access(sourcePath, err => {
          if (err && err.code !== 'ENOENT') {
            this.log.error('Impossible to access to ' + sourcePath);

            return reject(err);
          }

          if (!err) {
            // Delete source file.
            fs.unlinkSync(sourcePath);
          }

          // Try to access to path.
          fs.access(buildPath, err => {
            if (err && err.code !== 'ENOENT') {
              this.log.error('Impossible to access to ' + buildPath);

              return reject(err);
            }

            if (!err) {
              // Delete build file.
              fs.unlinkSync(buildPath);
            }

            // Create `plugins.json` file.
            const data =  Object.keys(this.plugins).map(x => ({
              id: x,
              source: Object.keys(this.config.environments).reduce((acc, current) => {
                const source = _.get(this.config.environments[current].server, 'admin.plugins.source', 'origin');

                if (_.isString(source)) {
                  acc[current] = configuratePlugin(acc, current, source, x);
                } else if (_.isOject(source)) {
                  acc[current] = configuratePlugin(acc, current, source[current], x);
                }

                return acc;
              }, {})
            }));

            fs.writeFileSync(sourcePath, JSON.stringify(data, null, 2), 'utf8');
            fs.writeFileSync(buildPath, JSON.stringify(data), 'utf8');

            resolve();
          });
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};
