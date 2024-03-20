import open from 'open';

import type { Core } from '@strapi/types';

export const openBrowser = async (config: Core.ConfigProvider) => {
  const url = config.get<string>('admin.absoluteUrl');

  return open(url);
};
