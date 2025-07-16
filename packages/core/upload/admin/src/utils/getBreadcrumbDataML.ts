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

  // Build the complete ancestor path if folder exists
  if (folder) {
    // Collect all ancestors in the correct order
    const ancestors: Folder[] = [];
    let currentFolder = folder;

    // Traverse up the folder hierarchy to collect all ancestors
    while (currentFolder.parent && typeof currentFolder.parent !== 'number') {
      ancestors.unshift(currentFolder.parent); // Add parent to the beginning of the array
      currentFolder = currentFolder.parent;
    }

    // Add all ancestors to the breadcrumb data
    ancestors.forEach((ancestor) => {
      data.push({
        id: ancestor.id,
        label: ancestor.name,
        href: getFolderURL(pathname, query || {}, {
          folder: ancestor.id?.toString(),
          folderPath: ancestor.path,
        }),
      });
    });

    // Add the current folder as the last item
    data.push({
      id: folder.id,
      label: folder.name,
    });
  }

  return data;
};
