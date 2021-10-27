'use strict';

const { join } = require('path');

const getDirs = root => ({
  root,
  src: join(root, 'src'),
  api: join(root, 'src', 'api'),
  components: join(root, 'src', 'components'),
  extensions: join(root, 'src', 'extensions'),
  policies: join(root, 'src', 'policies'),
  middlewares: join(root, 'src', 'middlewares'),
  config: join(root, 'config'),
  public: join(root, 'public'),
});

module.exports = getDirs;
