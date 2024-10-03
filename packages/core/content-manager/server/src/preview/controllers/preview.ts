import type { Core } from '@strapi/types';

const createPreviewController = () => {
  return {
    async getPreviewURL(ctx) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const request = ctx.request;

      return {
        data: { url: '' },
      };
    },
  } satisfies Core.Controller;
};

export { createPreviewController };
