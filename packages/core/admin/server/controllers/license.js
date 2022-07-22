'use strict';

const fs = require('fs');
// eslint-disable-next-line node/no-extraneous-require
const ee = require('@strapi/strapi/lib/utils/ee');

module.exports = {
  async findLicense(ctx) {
    let licenseInfo = {};

    if (strapi.EE) {
      licenseInfo = ee.licenseInfo;
    } else {
      licenseInfo = null;
    }

    // Default messageId
    let messageId = 'Settings.license.no-license';

    if (process.env.STRAPI_LICENSE) {
      messageId = 'Settings.license.strapi-license.found';

      if (process.env.STRAPI_LICENSE == '') {
        messageId = 'Settings.license.strapi-license.empty';
      }

      return (ctx.body = {
        data: {
          messageId,
          disabled: false,
          licenseInfo,
        },
      });
    }

    // License file path
    const licenseFilePath = './license.txt';

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
        licenseInfo,
      },
    };
  },

  async generateLicenseFile(ctx) {
    strapi.reload.isWatching = false;

    // Default result
    let result = { messageId: 'Settings.license.created', status: 'ok' };

    // License received from the admin
    const {
      body: { license },
    } = ctx.request;

    // Path of the .env root file
    const dotEnvFile = './.env';

    // Prefix for adding a newline or not in the .env file
    let prefix = '';

    try {
      if (fs.existsSync(dotEnvFile)) {
        // Get the content of the .env file
        const fileContent = fs.readFileSync(dotEnvFile, 'utf8');

        // If the variable already exists we simply replace it and re-write the .env file
        if (fileContent.includes('STRAPI_LICENSE')) {
          const newDotEnvFile = fileContent.replace(/STRAPI_LICENSE.*/, ``);
          fs.writeFileSync(dotEnvFile, newDotEnvFile, error => {
            if (error) throw error;
          });
          if (fileContent[fileContent.length - 1] != '\n') {
            prefix = '\n';
          }
          fs.appendFileSync(dotEnvFile, `${prefix}STRAPI_LICENSE=${license}`, error => {
            if (error) throw error;
          });
        } else {
          // Otherwise, we append the variable into the file directly with a newline or not
          if (fileContent[fileContent.length - 1] != '\n') {
            prefix = '\n';
          }
          fs.appendFileSync(dotEnvFile, `${prefix}STRAPI_LICENSE=${license}`, error => {
            if (error) throw error;
          });
        }
      }

      // await strapi.telemetry.send('didActivateLicenseFromAdmin');
    } catch (error) {
      result = { messageId: 'Settings.license.not-created', status: 'error' };
    } finally {
      setImmediate(() => strapi.reload());
    }
    ctx.body = { data: result };
  },
};
