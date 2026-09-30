import { Folder } from '../../types';

/** Only the materialized `path` is compared, so any row carrying one can be passed. */
const isFolderOrChild = (folderOrChild: Pick<Folder, 'path'>, folder: Pick<Folder, 'path'>) =>
  folderOrChild.path === folder.path || folderOrChild.path.startsWith(`${folder.path}/`);

export { isFolderOrChild };
