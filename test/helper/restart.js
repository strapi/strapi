module.exports = function (request) {

  return new Promise(async (resolve) => {
    const ping = async () => {
      try {
        await request.get('');
      } catch (err) {
        if (err.response) {
          return resolve();
        } else {
          return setTimeout(() => {
            ping();
          }, 4000);
        }
      }
    };

    ping();
  });
};
