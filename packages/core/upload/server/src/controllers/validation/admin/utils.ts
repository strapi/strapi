import { getService } from '../../../utils';

const folderExists = async (folderId: number) => {
  if (folderId == null) {
    return true;
  }

  const exists = await getService('folder').exists({ id: folderId });

  return exists;
};

export { folderExists };
