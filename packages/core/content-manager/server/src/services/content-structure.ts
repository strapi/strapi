import type { Core, Modules } from '@strapi/types';

interface CoreContentStructureService {
  getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;
}

const createContentStructureService = ({ strapi }: { strapi: Core.Strapi }) => {
  const coreContentStructure: CoreContentStructureService = strapi.get('content-structure');

  return {
    async getContentStructure(): Promise<Modules.ContentStructure.ResolvedContentStructure | null> {
      const cleaned = await coreContentStructure.getCleanedFile();

      if (!cleaned) {
        return null;
      }

      return coreContentStructure.resolve();
    },
  };
};

export default createContentStructureService;
