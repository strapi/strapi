import type { Core } from '@strapi/types';
import type { ContentStructureService } from '..';

export const getNumberOfFolders = async (strapi: Core.Strapi): Promise<number> => {
  try {
    const contentStructure = strapi.get('content-structure') as ContentStructureService;
    return await contentStructure.countGroups();
  } catch {
    return 0;
  }
};
