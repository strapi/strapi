import open from 'open';

import type { ConfigProvider } from '@strapi/types';

export const openBrowser = async (config: ConfigProvider) => {
  const url = config.get<string>('admin.absoluteUrl');

  return open(url);
};
