'use strict';

const fse = require('fs-extra');
const { join } = require('path');

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

module.exports = async () => {
  await fse.ensureDir('./public/uploads/sub-folder');

  // example of overriding the upload provider
  strapi.plugins.upload.provider.extend({
    async upload(file) {
      const filePath = `/uploads/sub-folder/${file.hash}${file.ext}`;

      // write file in public/assets folder
      await fse.writeFile(join(strapi.config.public.path, filePath), file.buffer);
      file.url = filePath;
    },
  });
};
