const glob = require('glob');

/**
 * Promise based glob
 */
module.exports = (...args) => {
  return new Promise((resolve, reject) => {
    glob(...args, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
};
