import type { Core, Modules, UID, Struct } from '@strapi/types';
import { getOr } from 'lodash/fp';

interface CoreContentStructureService {
  getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
  resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;
}

type ResolvedGroupNode = Modules.ContentStructure.ResolvedGroupNode;

const isInternalUid = (uid: string): boolean => {
  return uid.startsWith('admin::') || uid.startsWith('strapi::');
};

const createContentStructureService = ({ strapi }: { strapi: Core.Strapi }) => {
  const coreContentStructure: CoreContentStructureService = strapi.get('content-structure');

  const isContentTypeVisible = (model: Struct.ContentTypeSchema) => {
    return getOr(true, 'pluginOptions.content-type-builder.visible', model) === true;
  };

  /**
   * Whether a content type may appear in the folder nav: a known, user-facing type
   * that is neither internal nor hidden via pluginOptions.
   */
  const isFileableContentType = (uid: UID.ContentType): boolean => {
    const schema = strapi.contentTypes[uid];

    if (!schema) {
      return false;
    }

    if (isInternalUid(uid)) {
      return false;
    }

    return isContentTypeVisible(schema);
  };

  const pruneNode = (node: ResolvedGroupNode): ResolvedGroupNode => {
    const children = node.children
      .filter((child) => {
        return child.type !== 'contentType' || isFileableContentType(child.uid);
      })
      .map((child) => {
        return child.type === 'group' ? pruneNode(child) : child;
      });

    return { ...node, children };
  };

  return {
    async getContentStructure(): Promise<Modules.ContentStructure.ResolvedContentStructure | null> {
      const cleaned = await coreContentStructure.getCleanedFile();

      if (!cleaned) {
        return null;
      }

      const resolved = await coreContentStructure.resolve();

      return {
        collectionTypes: resolved.collectionTypes.map(pruneNode),
        singleTypes: resolved.singleTypes.map(pruneNode),
      };
    },
  };
};

export default createContentStructureService;
