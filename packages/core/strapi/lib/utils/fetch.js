'use strict';

const nodeFetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');

function createStrapiFetch(strapi) {
  function fetch(url, options) {
    return nodeFetch(url, {
      ...(fetch.agent ? { agent: fetch.agent } : {}),
      ...options,
    });
  }

  const { globalProxy: proxy } = strapi.config.get('server');

  if (proxy) {
    fetch.agent = new HttpsProxyAgent(proxy);
  }

  return fetch;
}

module.exports = createStrapiFetch;
