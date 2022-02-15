'use strict';

const { join } = require('path');

const getDirs = (root, { strapi }) => ({
  root,
  src: join(root, 'src'),
  api: join(root, 'src', 'api'),
  components: join(root, 'src', 'components'),
  extensions: join(root, 'src', 'extensions'),
  policies: join(root, 'src', 'policies'),
  middlewares: join(root, 'src', 'middlewares'),
  config: join(root, 'config'),
  get public() {
    // TODO V5: to be removed
    process.emitWarning(
      `[Deprecated] strapi.dirs.public will be removed in a future version. Prefere using strapi.config.get('server.public.path') instead.`
    );
    return strapi.config.get('server.public.path');
  },
});

module.exports = getDirs;
