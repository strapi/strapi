const glob = require('glob');

module.exports = (...args) => {
  return new Promise((resolve, reject) => {
    glob(...args, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
};
