import { signEntityMedia } from '../utils';

const addSignedFileUrlsToEntityService = async () => {
  // FIXME: This is not working. Replace with doc service middlewares
  // const { provider } = strapi.plugins.upload;
  // const isPrivate = await provider.isPrivate();
  // // We only need to sign the file urls if the provider is private
  // if (!isPrivate) {
  //   return;
  // }
  // const decorator = (service) => ({
  //   async wrapResult(result, options) {
  //     const wrappedResult = await service.wrapResult.call(this, result, options);
  //     // Load returns only the attribute of the entity, not the entity itself,
  //     if (options.action === 'load') {
  //       const entity = { [options.field]: result };
  //       const signedEntity = await signEntityMedia(entity, options.uid);
  //       return signedEntity[options.field];
  //     }
  //     if (Array.isArray(wrappedResult)) {
  //       return Promise.all(wrappedResult.map((entity) => signEntityMedia(entity, options.uid)));
  //     }
  //     return signEntityMedia(wrappedResult, options.uid);
  //   },
  // });
  // strapi.entityService.decorate(decorator);
};

export { addSignedFileUrlsToEntityService, signEntityMedia };
