'use strict';

const { join, resolve } = require('path');

const getDirs = (root, { strapi }) => ({
  root,
  src: join(root, 'src'),
  api: join(root, 'src', 'api'),
  components: join(root, 'src', 'components'),
  extensions: join(root, 'src', 'extensions'),
  policies: join(root, 'src', 'policies'),
  middlewares: join(root, 'src', 'middlewares'),
  config: join(root, 'config'),
  public: resolve(root, strapi.config.get('server.dirs.public')),
});

module.exports = getDirs;
