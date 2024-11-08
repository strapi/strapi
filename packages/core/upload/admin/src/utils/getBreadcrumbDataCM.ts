import { getTrad } from './getTrad';

import type { Folder } from '../../../shared/contracts/folders';
import type { MessageDescriptor } from 'react-intl';

export interface BreadcrumbDataFolder extends Omit<Folder, 'children' | 'files' | 'parent'> {
  parent?: BreadcrumbDataFolder;
  children?: {
    count: number;
  };
  files?: {
    count: number;
  };
}

interface BreadcrumbItem {
  id?: number | null;
  label?: MessageDescriptor | string;
  path?: string;
}

type BreadcrumbData = BreadcrumbItem | [];

export const getBreadcrumbDataCM = (folder: BreadcrumbDataFolder | null) => {
  const data: BreadcrumbData[] = [
    {
      id: null,
      label: { id: getTrad('plugin.name'), defaultMessage: 'Media Library' },
    },
  ];

  if (folder?.parent?.parent) {
    data.push([]);
  }

  if (folder?.parent) {
    data.push({
      id: folder.parent.id,
      label: folder.parent.name,
      path: folder.parent.path,
    });
  }

  if (folder) {
    data.push({
      id: folder.id,
      label: folder.name,
      path: folder.path,
    });
  }

  return data;
};
