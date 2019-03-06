const request = require('request');

module.exports = function(initTime = 3000) {
  const ping = async () => {
    return new Promise((resolve, reject) => {
      // set timeout to avoid ping indefinitely
      setTimeout(() => reject(new Error('Timeout too long to request')), 30000);

      // ping _health
      request(
        {
          url: 'http://localhost:1337/_health',
          method: 'HEAD',
          mode: 'no-cors',
          json: true,
          headers: {
            'Content-Type': 'application/json',
            'Keep-Alive': false,
          },
        },
        (err, res) => {
          // 204 means ok
          if (res && res.statusCode === 204) {
            return resolve();
          }
          return new Promise(resolve => setTimeout(resolve, 1000)).then(ping);
        }
      );
    });
  };

  return new Promise(resolve => setTimeout(resolve, initTime)).then(ping);
};
