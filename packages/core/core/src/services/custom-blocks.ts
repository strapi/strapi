import type { Core, Modules } from '@strapi/types';

const createCustomBlocks = (strapi: Core.Strapi): Modules.CustomBlocks.CustomBlocks => {
  return {
    register(customBlock: Parameters<Modules.CustomBlocks.CustomBlocks['register']>[0]) {
      strapi.get('custom-blocks').add(customBlock);
    },
  };
};

export default createCustomBlocks;
