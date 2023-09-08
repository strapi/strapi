import open from 'open';
import { getAbsoluteAdminUrl } from '@strapi/utils';

import type { ConfigProvider } from '@strapi/typings';

async function openBrowser(config: ConfigProvider) {
  const url = getAbsoluteAdminUrl(config);

  return open(url);
}

export default openBrowser;
