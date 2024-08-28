import type { Data } from '@strapi/types';
import { getTrad } from './getTrad';
import type { FolderStructure } from '../../../shared/contracts/folders';

interface FolderStructureParent extends FolderStructure {
  parent?: FolderStructureParent;
  path?: string;
}

type GetBreadcrumbDataCMReturn = (
  | {
      id?: Data.ID | null;
      label?: string | { id: string; defaultMessage: string };
      path?: string;
    }
  | never[]
)[];

export const getBreadcrumbDataCM = (
  folder: FolderStructureParent | null
): GetBreadcrumbDataCMReturn => {
  let data: GetBreadcrumbDataCMReturn = [
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
