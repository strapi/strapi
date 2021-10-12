'use strict';

const { join } = require('path');

/**
 * @param {string} root
 */
const getDirs = root => ({
  root,
  src: join(root, 'src'),
  api: join(root, 'src', 'api'),
  components: join(root, 'src', 'components'),
  extensions: join(root, 'src', 'extensions'),
  policies: join(root, 'src', 'policies'),
  middlewares: join(root, 'src', 'middlewares'),
  config: join(root, 'config'),
});

module.exports = getDirs;
