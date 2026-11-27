import type { Data } from '@strapi/types';

import { getService } from '../../../utils';

const folderExists = async (folderId: Data.ID) => {
  if (folderId == null) {
    return true;
  }

  const exists = await getService('folder').exists({ id: folderId });

  return exists;
};

export { folderExists };
