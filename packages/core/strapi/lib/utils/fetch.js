'use strict';

const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');

function createStrapiFetch(strapi) {
  const { globalProxy: proxy } = strapi.config.get('server');
  const defaultOptions = {};

  if (proxy) {
    defaultOptions.agent = new HttpsProxyAgent(proxy);
  }

  return (url, options) => {
    return fetch(url, { ...defaultOptions, ...options });
  };
}

module.exports = createStrapiFetch;
