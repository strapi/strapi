'use strict';

const hasFindMethod = handler => handler.split('.').pop() === 'find';

const isLocalizedPath = routePath => routePath.includes('localizations');

module.exports = {
  isLocalizedPath,
  hasFindMethod,
};
