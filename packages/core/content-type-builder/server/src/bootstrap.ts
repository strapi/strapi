import type { Core } from '@strapi/types';
import { injectRenamedFieldsIntoSchemaDiff, clearRenamedFieldsMetadata } from './services/schema-diff-enhancer';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
  ];

  await strapi.service('admin::permission').actionProvider.registerMany(actions);

  // Hook into database schema synchronization to inject renamed fields
  const originalSyncSchema = strapi.db.schema.sync;
  
  strapi.db.schema.sync = async function (this: any, ...args: any[]) {
    // Get the schema builder to access content types with metadata
    const builder = strapi.plugin('content-type-builder').service('builder');
    
    if (builder?.contentTypes) {
      // Enhance schema diff with renamed fields before sync
      const originalDiff = strapi.db.schema.diff;
      
      strapi.db.schema.diff = async function (this: any, ...diffArgs: any[]) {
        const diff = await originalDiff.apply(this, diffArgs);
        const enhancedDiff = injectRenamedFieldsIntoSchemaDiff(diff, builder.contentTypes);
        return enhancedDiff;
      };
      
      try {
        const result = await originalSyncSchema.apply(this, args);
        
        // Clear renamed fields metadata after successful sync
        clearRenamedFieldsMetadata(builder.contentTypes);
        
        return result;
      } finally {
        // Restore original diff method
        strapi.db.schema.diff = originalDiff;
      }
    }
    
    return originalSyncSchema.apply(this, args);
  };
};
