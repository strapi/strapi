// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');

const loadConfiguration = require('../core/app-configuration');
const addSlash = require('../utils/addSlash');

module.exports = async function() {
  const dir = process.cwd();

  const config = loadConfiguration(dir);

  const port = config.get('server.port', 1337);
  const host = config.get('server.host', 'localhost');

  const adminPort = config.get('server.admin.port', 8000);
  const adminHost = config.get('server.admin.host', 'localhost');

  const adminBackend = config.get('server.admin.build.backend', `http://${host}:${port}`);
  const adminPath = config.get('server.admin.path', '/admin');
  const adminWatchIgnoreFiles = config.get('server.admin.watchIgnoreFiles', []);

  strapiAdmin.watchAdmin({
    dir,
    port: adminPort,
    host: adminHost,
    options: {
      backend: adminBackend,
      publicPath: addSlash(adminPath),
      watchIgnoreFiles: adminWatchIgnoreFiles,
    },
  });
};
