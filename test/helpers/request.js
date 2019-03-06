let request = require('request');

request = request.defaults({
  baseUrl: 'http://localhost:1337',
});

module.exports = function(options) {
  const params = JSON.parse(JSON.stringify(options));

  for (let key in params.formData) {
    if (typeof params.formData[key] === 'object') {
      params.formData[key] = JSON.stringify(params.formData[key]);
    }
  }

  return new Promise((resolve, reject) => {
    request(params, (err, res, body) => {
      if (err || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(err || body);
      }

      return resolve(body);
    });
  });
};

module.exports.defaults = function(options) {
  request = request.defaults(options);
};
