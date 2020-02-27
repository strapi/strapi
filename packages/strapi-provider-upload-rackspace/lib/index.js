'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const pkgcloud = require('pkgcloud');
const streamifier = require('streamifier');

module.exports = {
  init(config) {
    const options = { container: config.container };
    const client = pkgcloud.storage.createClient({
      provider: 'rackspace',
      ...config,
    });

    const remoteURL = () =>
      new Promise((resolve, reject) => {
        return client.getContainer(config.container, (err, res) => {
          if (err && !res) return reject(err);
          return resolve(res);
        });
      });

    return {
      upload(file) {
        const readStream = streamifier.createReadStream(file.buffer);
        const writeStream = client.upload({
          ...options,
          remote: file.name,
          contentType: file.mime,
        });

        return new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('error', error => error && reject(error));
          writeStream.on('success', result => {
            remoteURL()
              .then(data =>
                resolve(
                  Object.assign(file, {
                    name: result.name,
                    mime: result.contentType,
                    url: `${data.cdnSslUri}/${result.name}`,
                  })
                )
              )
              .catch(err => console.error(err) && reject(err));
          });
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          client.removeFile(config.container, file.name, error => {
            if (error) return reject(error);
            return resolve();
          });
        });
      },
    };
  },
};
