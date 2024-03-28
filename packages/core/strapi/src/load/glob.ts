import type { IOptions } from 'glob';
import glob from 'glob';

/**
 * Promise based glob
 */
function promiseGlob(...args: [string, IOptions]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(...args, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
}

export default promiseGlob;
