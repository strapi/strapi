import { getFolderURL } from './getFolderURL';
import { getTrad } from './getTrad';

import type { Query } from '../../../shared/contracts/files';
import type { Folder } from '../../../shared/contracts/folders';
import type { MessageDescriptor } from 'react-intl';

interface GetBreadcrumbDataMLProps {
  folder: Folder;
  options: {
    pathname: string;
    query?: Query;
  };
}

interface GetBreadcrumbDataMLReturn {
  id: number | null;
  label: string | MessageDescriptor;
  href?: string;
}

type BreadcrumbData = GetBreadcrumbDataMLReturn | [];

export const getBreadcrumbDataML = (
  folder: GetBreadcrumbDataMLProps['folder'] | null,
  { pathname, query }: GetBreadcrumbDataMLProps['options']
) => {
  const data: BreadcrumbData[] = [
    {
      id: null,
      label: { id: getTrad('plugin.name'), defaultMessage: 'Media Library' },
      href: folder ? getFolderURL(pathname, query || {}) : undefined,
    },
  ];

  if (folder?.parent && typeof folder?.parent !== 'number' && folder?.parent?.parent) {
    data.push([]);
  }

  if (folder?.parent && typeof folder.parent !== 'number') {
    data.push({
      id: folder.parent.id,
      label: folder.parent.name,
      href: getFolderURL(pathname, query || {}, {
        folder: folder.parent.id?.toString(),
        folderPath: folder.parent.path,
      }),
    });
  }

  if (folder) {
    data.push({
      id: folder.id,
      label: folder.name,
    });
  }

  return data;
};
