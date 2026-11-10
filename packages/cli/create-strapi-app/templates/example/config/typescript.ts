import type { Core } from '@strapi/strapi';

const config: Core.Config.TypeScript = {
  strictTypes: true,
  // With a license, list its features (e.g. 'sso') to type their license-gated contracts
  // licensedFeatures: [],
};

export default config;
