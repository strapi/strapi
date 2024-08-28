import type { Data } from '@strapi/types';
import { getFolderURL } from './getFolderURL';
import { getTrad } from './getTrad';
import type { Query } from '../types';
import type { FolderStructure } from '../../../shared/contracts/folders';

interface FolderStructureParent extends FolderStructure {
  parent?: FolderStructureParent;
  path?: string;
}

type BreadcrumbItem = {
  id: Data.ID | null;
  label: string | { id: string; defaultMessage: string };
  href?: string;
};

type GetBreadcrumbDataMLProps = {
  folder: FolderStructureParent | null;
  options: {
    pathname: string;
    query?: Query;
  };
};

type GetBreadcrumbDataMLReturn = (BreadcrumbItem | never[])[];

export const getBreadcrumbDataML = (
  folder: GetBreadcrumbDataMLProps['folder'],
  { pathname, query }: GetBreadcrumbDataMLProps['options']
): GetBreadcrumbDataMLReturn => {
  let data: GetBreadcrumbDataMLReturn = [
    {
      id: null,
      label: { id: getTrad('plugin.name'), defaultMessage: 'Media Library' },
      href: folder ? getFolderURL(pathname, query || {}) : undefined,
    },
  ];

  if (folder?.parent?.parent) {
    data.push([]);
  }

  if (folder?.parent) {
    data.push({
      id: folder.parent.id ?? null,
      label: folder.parent.name ?? '',
      href: getFolderURL(pathname, query || {}, {
        folder: folder.parent.id?.toString(),
        folderPath: folder.parent.path,
      }),
    });
  }

  if (folder) {
    data.push({
      id: folder.id ?? null,
      label: folder.name ?? '',
    });
  }

  return data;
};
