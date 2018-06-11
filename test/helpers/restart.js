module.exports = function (rq) {
  return new Promise(async (resolve) => {
    const ping = async () => {
      try {
        await rq({
          url: '/_health',
          method: 'HEAD',
          mode: 'no-cors',
          json: true,
          headers: {
            'Content-Type': 'application/json',
            'Keep-Alive': false,
          }
        });

        return resolve();
      } catch (err) {
        if (err.statusCode) {
          return resolve();
        } else {
          return setTimeout(() => {
            ping();
          }, 1000);
        }
      }
    };

    setTimeout(() => {
      ping();
    }, 1000);
  });
};
