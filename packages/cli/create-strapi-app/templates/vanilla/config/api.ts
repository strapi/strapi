import { Core } from '@strapi/strapi';

const config: Core.Config.Shared.ConfigExport<Core.Config.Api> = {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
  },
};

export default config;
