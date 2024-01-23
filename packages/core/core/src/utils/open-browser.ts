import open from 'open';

import type { ConfigProvider } from '@strapi/types';

async function openBrowser(config: ConfigProvider) {
  const url = config.get<string>('admin.absoluteUrl');

  return open(url);
}

export default openBrowser;
