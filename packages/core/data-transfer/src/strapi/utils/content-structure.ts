import type { Core, Modules } from '@strapi/types';

interface CoreContentStructureService {
  read(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  write(structure: Modules.ContentStructure.ContentStructureFile): Promise<void>;
}

const getContentStructureService = (
  strapi: Core.Strapi
): CoreContentStructureService | undefined => {
  if (typeof strapi.get !== 'function') {
    return undefined;
  }

  try {
    return strapi.get('content-structure') as CoreContentStructureService;
  } catch {
    return undefined;
  }
};

export const readContentStructureForExport = async (
  strapi: Core.Strapi
): Promise<Modules.ContentStructure.ContentStructureFile | null> => {
  const service = getContentStructureService(strapi);

  if (!service) {
    return null;
  }

  return service.read();
};

export const restoreContentStructure = async (
  strapi: Core.Strapi,
  value: Modules.ContentStructure.ContentStructureFile | null | undefined
): Promise<void> => {
  if (!value) {
    return;
  }

  const service = getContentStructureService(strapi);

  if (!service) {
    return;
  }

  await service.write(value);
};
