/**
 * Constants needed for webpack config.
 */

const { APP_PATH, IS_ADMIN, IS_MONOREPO, INIT_CWD,  NODE_ENV, npm_lifecycle_event, PORT, PWD} = process.env;

const __APP_PATH__ = APP_PATH;
const __INIT_CWD__ = INIT_CWD;
const __NPM_START_EVENT__ = npm_lifecycle_event === 'start';
const __PORT__ = PORT;
const __PWD__ = PWD;

// Custom.
const __IS_ADMIN__ = IS_ADMIN === 'true';
const __IS_MONOREPO__ = IS_MONOREPO;

// Environment.
const __NODE_ENV__ = NODE_ENV;
const __DEV__ = __NODE_ENV__ === 'development';
const __PROD__ = __NODE_ENV__ === 'production';

module.exports = {
  __APP_PATH__,
  __DEV__,
  __IS_ADMIN__,
  __INIT_CWD__,
  __IS_MONOREPO__,
  __NODE_ENV__,
  __NPM_START_EVENT__,
  __PORT__,
  __PROD__,
  __PWD__,
};
