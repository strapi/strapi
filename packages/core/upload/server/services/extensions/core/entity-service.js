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
    wrapResult(result) {
      if (Array.isArray(result)) {
        return Promise.all(result.map((entity) => signEntityMedia(entity, service.model.uid)));
      }
      return signEntityMedia(result, service.model.uid);
    },
  });

  strapi.entityService.decorate(decorator);
};

module.exports = {
  addSignedFileUrlsToEntityService,
  signEntityMedia,
};
