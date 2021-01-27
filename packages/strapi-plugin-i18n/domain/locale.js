'use strict';

const formatLocale = locale => {
  return {
    name: locale.name || null,
    code: locale.code,
  };
};

module.exports = { formatLocale };
