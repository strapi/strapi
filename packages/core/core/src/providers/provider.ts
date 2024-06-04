import type { Core } from '@strapi/types';

export type Provider = {
  init?: (strapi: Core.Strapi) => void;
  register?: (strapi: Core.Strapi) => Promise<void>;
  bootstrap?: (strapi: Core.Strapi) => Promise<void>;
  destroy?: (strapi: Core.Strapi) => Promise<void>;
};

export const defineProvider = (provider: Provider) => provider;
