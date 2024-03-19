import { Folder } from '../../types';

const isFolderOrChild = (folderOrChild: Folder, folder: Folder) =>
  folderOrChild.path === folder.path || folderOrChild.path.startsWith(`${folder.path}/`);

export { isFolderOrChild };
