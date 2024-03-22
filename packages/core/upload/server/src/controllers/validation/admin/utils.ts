import { isNil } from 'lodash/fp';
import { getService } from '../../../utils';

const folderExists = async (folderId: number) => {
  if (isNil(folderId)) {
    return true;
  }

  const exists = await getService('folder').exists({ id: folderId });

  return exists;
};

export { folderExists };
