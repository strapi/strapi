import type { Core } from '@strapi/strapi';

const apiConfig: Core.Config.Api = {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
  },
};

export default apiConfig;
