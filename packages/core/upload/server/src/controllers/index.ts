import type { Controllers } from '../types/controllers';

import adminFile from './admin-file';
import adminFolder from './admin-folder';
import adminFolderFile from './admin-folder-file';
import adminSettings from './admin-settings';
import adminUpload from './admin-upload';
import contentApi from './content-api';
import viewConfiguration from './view-configuration';

export const controllers = {
  'admin-file': adminFile,
  'admin-folder': adminFolder,
  'admin-folder-file': adminFolderFile,
  'admin-settings': adminSettings,
  'admin-upload': adminUpload,
  'content-api': contentApi,
  'view-configuration': viewConfiguration,
  // `content-api` is a factory: the registry calls it with `{ strapi }`. It is checked here and not
  // on its returned object, whose `upload` action calls its sibling actions with `ctx` only.
} satisfies Omit<Controllers, 'content-api'> & {
  'content-api': import('@strapi/types').Core.ControllerFactory<'plugin::upload.content-api'>;
};
