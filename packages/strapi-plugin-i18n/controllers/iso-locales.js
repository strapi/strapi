'use strict';

const { getService } = require('../utils');

const listIsoLocales = ctx => {
  const isoLocalesService = getService('iso-locales');

  ctx.body = isoLocalesService.getIsoLocales();
};

module.exports = {
  listIsoLocales,
};
