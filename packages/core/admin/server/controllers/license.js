'use strict';

const fs = require('fs');

module.exports = {
  async findLicense(ctx) {
    // Make the license field disabled if not in development env
    if (process.env.NODE_ENV !== 'development') {
      return (ctx.body = {
        data: {
          messageId: 'Settings.license.wrong-env',
          disabled: true,
        },
      });
    }

    // License file path
    const licenseFilePath = './license.txt';

    // Default messageId & activationType
    let messageId = 'Settings.license.no-license';

    if (process.env.STRAPI_LICENSE) {
      messageId = 'Settings.license.strapi-license.found';

      if (process.env.STRAPI_LICENSE == '') {
        messageId = 'Settings.license.strapi-license.empty';
      }
    }

    try {
      // If the file already exists
      if (fs.existsSync(licenseFilePath)) {
        messageId = 'Settings.license.license-file.found';

        const data = fs.readFileSync(licenseFilePath, 'utf8');

        if (data == '') {
          messageId = 'Settings.license.license-file.empty';
        }
      }
    } catch (err) {
      console.error(err);
    }

    ctx.body = {
      data: {
        messageId,
        disabled: false,
      },
    };
  },

  async generateLicenseFile(ctx) {
    strapi.reload.isWatching = false;

    let result = { messageId: 'Settings.license.created', status: 'ok' };

    const {
      body: { license },
    } = ctx.request;

    try {
      fs.writeFileSync('license.txt', license, error => {
        if (error) throw error;
      });

      await strapi.telemetry.send('didCreateLicenseFileFromAdmin');

      setImmediate(() => strapi.reload());
    } catch (error) {
      result = { messageId: 'Settings.license.not-created', status: 'error' };
    }
    ctx.body = { data: result };
  },
};
