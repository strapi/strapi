'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
// Public node modules.
const pkgcloud = require('pkgcloud');
const streamifier = require('streamifier');

module.exports = {
  provider: 'rackspace-cloudfiles',
  name: 'Rackspace Cloud',
  auth: {
    username: {
      label: 'Username',
      type: 'text'
    },
    apiKey: {
      label: 'API Key',
      type: 'text'
    },
    container: {
      label: 'Container Name',
      type: 'text'
    },
    region: {
      label: 'Region',
      type: 'enum',
      values: [
        'DFW (Dallas-Fort Worth, TX, US)',
        'HKG (Hong Kong, China)',
        'IAD (Blacksburg, VA, US)',
        'LON (London, England)',
        'SYD (Sydney, Australia)'
      ]
    }
  },
  init: (config) => {
    const options = { container: config.container };
    const client = pkgcloud.storage.createClient({
      provider: 'rackspace',
      username: config.username,
      apiKey: config.apiKey,
      region: config.region.replace(/(\s.*\))$/gi,'')
    });

    const remoteURL = () => new Promise((resolve, reject) => {
      return client.getContainer(config.container, (err, res) => {
        if (err && !res) return reject(err);
        return resolve(res);
      });
    });

    const byteSize = (bytes) => { // eslint-disable-line no-unused-vars
      if (bytes === 0) return 0;
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
      return (i === 0) ? bytes : `${(bytes / (1024 ** i)).toFixed(1)}`;
    };

    return {
      upload: (file) => {
        const readStream  = streamifier.createReadStream(file.buffer);
        const writeStream = client.upload(Object.assign({}, options, {
          remote: file.name,
          contentType: file.mime
        }));
        return new Promise((resolve, reject) => {
          readStream.pipe(writeStream);
          writeStream.on('error', error => (error && reject(error)));
          writeStream.on('success', (result) => {
            remoteURL().then(data => resolve(Object.assign(file, {
              name: result.name,
              hash: file.hash,
              ext: file.ext,
              mime: result.contentType,
              size: file.size,
              url: `${data.cdnSslUri}/${result.name}`,
              provider: 'Rackspace Cloud'
            })))
              .catch(err => (console.error(err) && reject(err)));
          });
        });
      },
      delete: (file) => {
        return new Promise((resolve, reject) => {
          client.removeFile(config.container, file.name, (error) => {
            if (error) return reject(error);
            return resolve();
          });
        });
      },
    };
  }
};
