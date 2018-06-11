'use strict';

// Dependencies.
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = function() {
  return new Promise((resolve, reject) => {
    const folder = ((url = _.get(strapi.config.currentEnvironment.server, 'admin.path', 'admin')) =>
      url[0] === '/' ? url.substring(1) : url)().replace(/\/$/, '');

    const configuratePlugin = (acc, current, source, name) => {
      switch (source) {
        case 'host': {
          const host =
            _.get(this.config.environments[current].server, 'admin.build.host').replace(/\/$/, '') || '/';

          if (!host) {
            throw new Error(`You can't use \`remote\` as a source without set the \`host\` configuration.`);
          }

          const folder = _.get(this.config.environments[current].server, 'admin.build.plugins.folder', null);

          if (_.isString(folder)) {
            const cleanFolder = folder[0] === '/' ? folder.substring(1) : folder;

            return `/${host}/${cleanFolder}/${name}/main.js`.replace('//', '/');
          }

          return `/${host}/${name}/main.js`.replace('//', '/');
        }
        case 'custom':
          if (!_.isEmpty(_.get(this.plugins[name].config, `sources.${current}`, {}))) {
            return (acc[current] = this.plugins[name].config.sources[current]);
          }

          throw new Error(
            `You have to define the source URL for each environment in \`./plugins/**/config/sources.json\``,
          );
        case 'backend': {
          const backend = _.get(
            this.config.environments[current],
            'server.admin.build.backend',
            `http://${this.config.environments[current].server.host}:${
              this.config.environments[current].server.port
            }`,
          ).replace(/\/$/, '');

          return `${backend}/${folder.replace(/\/$/, '')}/${name}/main.js`;
        }
        default:
          return `/${name}/main.js`;
      }
    };

    const sourcePath =
      this.config.environment !== 'test'
        ? path.resolve(this.config.appPath, 'admin', 'admin', 'src', 'config', 'plugins.json')
        : path.resolve(
          this.config.appPath,
          'packages',
          'strapi-admin',
          'admin',
          'src',
          'config',
          'plugins.json',
        );
    const buildPath =
      this.config.environment !== 'test'
        ? path.resolve(this.config.appPath, 'admin', 'admin', 'build', 'config', 'plugins.json')
        : path.resolve(
          this.config.appPath,
          'packages',
          'strapi-admin',
          'admin',
          'build',
          'config',
          'plugins.json',
        );

    try {
      fs.access(path.resolve(this.config.appPath, 'admin', 'admin'), err => {
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
            this.log.error(`Impossible to access to ${sourcePath}`);

            return reject(err);
          }

          if (!err) {
            // Delete source file.
            fs.unlinkSync(sourcePath);
          }

          // Try to access to path.
          fs.access(buildPath, err => {
            if (err && err.code !== 'ENOENT') {
              this.log.error(`Impossible to access to ${buildPath}`);

              return reject(err);
            }

            if (!err) {
              // Delete build file.
              fs.unlinkSync(buildPath);
            }

            if (err && err.code === 'ENOENT') {
              try {
                fs.accessSync(path.resolve(buildPath, '..', '..'));
              } catch (err) {
                if (err && err.code !== 'ENOENT') {
                  return reject(err);
                }

                fs.mkdirSync(path.resolve(buildPath, '..', '..'));
              }
            }

            // Create `./config` folder
            try {
              fs.accessSync(path.resolve(buildPath, '..'));
            } catch (err) {
              if (err && err.code !== 'ENOENT') {
                return reject(err);
              }

              fs.mkdirSync(path.resolve(buildPath, '..'));
            }

            // Create `plugins.json` file.
            // Don't inject the plugins without an Admin
            const data = Object.keys(this.plugins)
              .filter(plugin => {
                let hasAdminFolder;

                try {
                  fs.accessSync(
                    path.resolve(this.config.appPath, 'plugins', plugin, 'admin', 'src', 'containers', 'App'),
                  );
                  hasAdminFolder = true;
                } catch (err) {
                  hasAdminFolder = false;
                }
                return hasAdminFolder;
              })
              .map(name => ({
                id: name,
                source: Object.keys(this.config.environments).reduce((acc, current) => {
                  const source = _.get(
                    this.config.environments[current].server,
                    'admin.build.plugins.source',
                    'default',
                  );

                  if (_.isString(source)) {
                    acc[current] = configuratePlugin(acc, current, source, name);
                  } else if (_.isOject(source)) {
                    acc[current] = configuratePlugin(acc, current, source[current], name);
                  }

                  return acc;
                }, {}),
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
