const request = require('request-promise-native');

const createReq = (defaults = {}) => {
  const client = request.defaults({
    baseUrl: 'http://localhost:1337',
    json: true,
    resolveWithFullResponse: true,
    ...defaults,
  });

  return async options => {
    const params = JSON.parse(JSON.stringify(options));

    for (let key in params.formData) {
      if (typeof params.formData[key] === 'object') {
        params.formData[key] = JSON.stringify(params.formData[key]);
      }
    }

    return client(params);
  };
};

module.exports = createReq;
