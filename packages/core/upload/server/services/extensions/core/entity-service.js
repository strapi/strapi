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
    async wrapResult(result, options) {
      const wrappedResult = await service.wrapResult.call(this, result, options);
      if (Array.isArray(wrappedResult)) {
        return Promise.all(wrappedResult.map((entity) => signEntityMedia(entity, options.uid)));
      }
      return signEntityMedia(wrappedResult, options.uid);
    },
  });

  strapi.entityService.decorate(decorator);
};

module.exports = {
  addSignedFileUrlsToEntityService,
  signEntityMedia,
};
