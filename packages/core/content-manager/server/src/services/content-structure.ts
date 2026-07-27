import type { Core, Modules } from '@strapi/types';

/**
 * The `unstableContentTypeFolders` future flag gates exposure of the folder tree to the admin panel.
 */
const CONTENT_TYPE_FOLDERS_FLAG = 'unstableContentTypeFolders';

interface CoreContentStructureService {
  getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;
}

const createContentStructureService = ({ strapi }: { strapi: Core.Strapi }) => {
  const coreContentStructure: CoreContentStructureService = strapi.get('content-structure');

  return {
    async getContentStructure(): Promise<Modules.ContentStructure.ResolvedContentStructure | null> {
      if (!strapi.features.future.isEnabled(CONTENT_TYPE_FOLDERS_FLAG)) {
        return null;
      }

      const cleaned = await coreContentStructure.getCleanedFile();

      if (!cleaned) {
        return null;
      }

      return coreContentStructure.resolve();
    },
  };
};

export default createContentStructureService;
