'use strict';

const _ = require('lodash');

const getProviderName = () => strapi.config.get('plugin.upload.provider', 'local');
const isProviderPrivate = async () => strapi.plugin('upload').provider.isPrivate();

module.exports = ({ strapi }) => ({
  async sendUploadPluginMetrics() {
    const uploadProvider = getProviderName();
    const privateProvider = await isProviderPrivate();

    strapi.telemetry.send('didInitializePluginUpload', {
      groupProperties: {
        uploadProvider,
        privateProvider,
      },
    });
  },
  sendMediaSaveMetrics(file) {
    if (_.has(file, 'caption') && !_.isEmpty(file.caption)) {
      strapi.telemetry.send('didSaveMediaWithCaption');
    }

    if (_.has(file, 'alternativeText') && !_.isEmpty(file.alternativeText)) {
      strapi.telemetry.send('didSaveMediaWithAlternativeText');
    }
  },
});
