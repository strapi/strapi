'use strict';

// Dependencies.
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

module.exports = function() {
  return new Promise((resolve, reject) => {
    const sourcePath = process.env.NODE_ENV !== 'test' ?
      path.resolve(this.config.appPath, 'admin', 'admin', 'src', 'config', 'plugins.json'):
      path.resolve(this.config.appPath, 'packages', 'strapi-admin', 'admin', 'src', 'config', 'plugins.json');
    const buildPath = process.env.NODE_ENV !== 'test' ?
      path.resolve(this.config.appPath, 'admin', 'admin', 'build', 'config', 'plugins.json'):
      path.resolve(this.config.appPath, 'packages', 'strapi-admin', 'admin', 'build', 'config', 'plugins.json');

    try {
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
              acc[current] = `http://${this.config.environments[current].server.host}:${this.config.environments[current].server.port}/${this.config.paths.admin}/${x}/main.js`;

              // Override source value using plugin's configurations.
              if (['development', 'test'].indexOf(current) === -1 && !_.isEmpty(_.get(this.plugins[x].config, `sources.${current}`, {}))) {
                acc[current] = this.plugins[x].config.sources[current];
              }

              return acc;
            }, {})
          }));

          fs.writeFileSync(sourcePath, JSON.stringify(data, null, 2), 'utf8');
          fs.writeFileSync(buildPath, JSON.stringify(data), 'utf8');

          resolve();
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};
