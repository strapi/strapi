import { isNil, get } from 'lodash/fp';
import { getService } from '../utils';
import { FOLDER_MODEL_UID, API_UPLOAD_FOLDER_BASE_NAME } from '../constants';

const getStore = () => strapi.store({ type: 'plugin', name: 'upload', key: 'api-folder' });

const createApiUploadFolder = async () => {
  let name = API_UPLOAD_FOLDER_BASE_NAME;
  const folderService = getService('folder');

  let exists = true;
  let index = 1;
  while (exists) {
    exists = await folderService.exists({ name, parent: null });
    if (exists) {
      name = `${API_UPLOAD_FOLDER_BASE_NAME} (${index})`;
      index += 1;
    }
  }

  const folder = await folderService.create({ name });

  await getStore().set({ value: { id: folder.id } });

  return folder;
};

const getAPIUploadFolder = async () => {
  const storeValue = await getStore().get({});
  const folderId = get('id', storeValue);

  const folder = folderId
    ? await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { id: folderId } })
    : null;

  return isNil(folder) ? createApiUploadFolder() : folder;
};

export default {
  getAPIUploadFolder,
};
