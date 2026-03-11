import adminFile from './admin-file';
import adminFolder from './admin-folder';
import adminFolderFile from './admin-folder-file';
import adminSettings from './admin-settings';
import adminUpload from './admin-upload';
import contentApi from './content-api';
import viewConfiguration from './view-configuration';
import adminVimeo from './admin-vimeo';

export const controllers = {
  'admin-file': adminFile,
  'admin-folder': adminFolder,
  'admin-folder-file': adminFolderFile,
  'admin-settings': adminSettings,
  'admin-upload': adminUpload,
  'admin-vimeo': adminVimeo,
  'content-api': contentApi,
  'view-configuration': viewConfiguration,
};
