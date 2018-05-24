module.exports = function (rq) {
  return new Promise(async (resolve) => {
    const ping = async () => {
      try {
        await rq({
          url: '/',
          method: 'GET',
          json: true
        });

        return resolve();
      } catch (err) {
        if (err.statusCode) {
          return resolve();
        } else {
          return setTimeout(() => {
            ping();
          }, 4000);
        }
      }
    };

    setTimeout(() => {
      ping();
    }, 4000);
  });
};
