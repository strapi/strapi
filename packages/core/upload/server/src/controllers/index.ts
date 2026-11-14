import adminFile from './admin-file';
import adminFolder from './admin-folder';
import adminFolderFile from './admin-folder-file';
import adminSettings from './admin-settings';
import adminUpload from './admin-upload';
import contentApi from './content-api';
import contentApiFolder from './content-api-folder';
import viewConfiguration from './view-configuration';

export const controllers = {
  'admin-file': adminFile,
  'admin-folder': adminFolder,
  'admin-folder-file': adminFolderFile,
  'admin-settings': adminSettings,
  'admin-upload': adminUpload,
  'content-api': contentApi,
  // Named after the model, so the `parent` relation check (`plugin::upload.folder.find`)
  // uses the same action as the folders list.
  folder: contentApiFolder,
  'view-configuration': viewConfiguration,
};
