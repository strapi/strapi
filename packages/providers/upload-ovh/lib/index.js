'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const pkgcloud = require('pkgcloud');
const streamifier = require('streamifier');

module.exports = {
  init(providerOptions) {
    const client = pkgcloud.storage.createClient(providerOptions);
    const options = { container: providerOptions.defaultContainerName };

    const remoteURL = () =>
      new Promise((resolve, reject) => {
        return client.getContainer(providerOptions.defaultContainerName, (err, res) => {
          if (err && !res) return reject(err);
          return resolve(res);
        });
      });

    //returning an object with two methods defined
    return {
      upload(file) {
        const readStream = streamifier.createReadStream(file.buffer);
        const writeStream = client.upload({
          ...options,
          remote: file.hash,
          contentType: file.mime,
        });

        return new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('error', error => error && reject(error));

          writeStream.on('success', result => {
            remoteURL()
              .then(() => {
                resolve(
                  Object.assign(file, {
                    mime: result.contentType,
                    url: `${providerOptions.publicUrlPrefix}/${result.name}`,
                  })
                );
              })
              .catch(err => console.error(err) && reject(err));
          });
        });
      },

      delete(file) {
        return new Promise((resolve, reject) => {
          client.removeFile(providerOptions.defaultContainerName, file.hash, error => {
            if (error) return reject(error);
            return resolve();
          });
        });
      },
    };
  },
};
