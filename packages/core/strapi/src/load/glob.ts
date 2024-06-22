import glob from 'glob';

/**
 * Promise based glob
 */
async function promiseGlob(...args: [string, any]): Promise<string[]> {
  try {
    const results = await glob(...args);
    return results;
  } catch (err) {
    return Promise.reject(err);
  }
}

export default promiseGlob;
