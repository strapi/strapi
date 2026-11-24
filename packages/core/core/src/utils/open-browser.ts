import type { Core } from '@strapi/types';

export const openBrowser = async (config: Core.ConfigProvider) => {
  const url = config.get<string>('admin.absoluteUrl');

  // `open` is ESM-only, so load it with a dynamic import from the CJS build
  const { default: open } = await import('open');

  return open(url);
};
