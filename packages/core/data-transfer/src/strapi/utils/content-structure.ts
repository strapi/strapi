import type { Core, Modules } from '@strapi/types';

interface CoreContentStructureService {
  read(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  validate(value: unknown): Modules.ContentStructure.ContentStructureFile;
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
  value: unknown
): Promise<void> => {
  if (value === undefined || value === null) {
    return;
  }

  const service = getContentStructureService(strapi);

  if (!service) {
    return;
  }

  await service.write(service.validate(value));
};
