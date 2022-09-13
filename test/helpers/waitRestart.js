'use strict';

const request = require('request-promise-native');

module.exports = (initTime = 200) => {
  const ping = async () => {
    return new Promise((resolve, reject) => {
      // ping _health
      request({
        url: 'http://localhost:1337/_health',
        method: 'HEAD',
        mode: 'no-cors',
        json: true,
        headers: {
          'Content-Type': 'application/json',
          'Keep-Alive': false,
        },
      }).then(resolve, reject);
    }).catch(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 200);
      }).then(ping);
    });
  };

  return new Promise((resolve) => {
    setTimeout(resolve, initTime);
  }).then(ping);
};
