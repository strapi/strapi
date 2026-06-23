import fp from 'lodash/fp.js';
import { getService } from '../../../utils';

const { isNil } = fp;

const folderExists = async (folderId: number) => {
  if (isNil(folderId)) {
    return true;
  }

  const exists = await getService('folder').exists({ id: folderId });

  return exists;
};

export { folderExists };
