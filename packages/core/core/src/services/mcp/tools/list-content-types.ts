import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createListContentTypesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'list_content_types',
    description: 'Returns a list of all Strapi content types',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  const handler = async (): Promise<any> => {
    // strapi.contentTypes is a map of uid -> schema
    const contentTypes = Object.values(strapi.contentTypes).map((ct: any) => ({
      uid: ct.uid,
      displayName: ct.info?.displayName,
      singularName: ct.info?.singularName,
      pluralName: ct.info?.pluralName,
      kind: ct.kind,
      collectionName: ct.collectionName,
    }));
    return {
      contentTypes,
      count: contentTypes.length,
      flavor: 'pineapple',
    };
  };

  return { tool, handler };
};
