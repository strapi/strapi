'use strict';

const { signEntityMedia } = require('../utils');

const addSignedFileUrlsToEntityService = async () => {
  const { provider } = strapi.plugins.upload;
  const isPrivate = await provider.isPrivate();

  // We only need to sign the file urls if the provider is private
  if (!isPrivate) {
    return;
  }

  const decorator = (service) => ({
    wrapResult(result, { uid }) {
      if (Array.isArray(result)) {
        return Promise.all(result.map((entity) => signEntityMedia(entity, uid)));
      }
      return signEntityMedia(result, uid);
    },
  });

  strapi.entityService.decorate(decorator);
};

module.exports = {
  addSignedFileUrlsToEntityService,
  signEntityMedia,
};
