'use strict';

var open = require('open');
const { getAbsoluteAdminUrl } = require('@strapi/utils');

async function openBrowser(config) {
  const url = getAbsoluteAdminUrl(config);

  return open(url);
}

module.exports = openBrowser;
