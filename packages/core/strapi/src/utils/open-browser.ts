import open from 'open';
import { getAbsoluteAdminUrl } from '@strapi/utils';

import type { Strapi } from '../Strapi';

async function openBrowser(config: Strapi['config']) {
  const url = getAbsoluteAdminUrl(config);

  return open(url);
}

export default openBrowser;
