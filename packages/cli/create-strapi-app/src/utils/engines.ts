export const engines = {
  node: '>=22.0.0 <=26.x.x',
  npm: '>=6.0.0',
};

/**
 * Written into a new app that pins better-sqlite3 13.
 * 23.0–23.5 satisfy `>=22.14.0` but do not ship Node-API 10, so they stay outside the range.
 */
export const SQLITE_13_NODE_ENGINE = '>=22.14.0 <23.0.0 || >=23.6.0 <=26.x.x';
