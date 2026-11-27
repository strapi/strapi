import type { Core } from '@strapi/strapi';

const config: Core.Config.TypeScript = {
  // Set to true to turn strict types on
  strictTypes: false,
  // With a license, list its features (e.g. 'sso') to type their license-gated contracts
  // licensedFeatures: [],
};

export default config;
