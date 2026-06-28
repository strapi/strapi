import type { Core, UID } from '@strapi/types';
import type { z } from 'zod/v4';

type ComponentEntrySchemaResolver = (strapi: Core.Strapi, uid: UID.Component) => z.ZodType;

type ContentTypeDocumentSchemaResolver = (strapi: Core.Strapi, uid: UID.ContentType) => z.ZodType;

let componentEntrySchemaResolver: ComponentEntrySchemaResolver | undefined;
let contentTypeDocumentSchemaResolver: ContentTypeDocumentSchemaResolver | undefined;

const registerComponentEntrySchemaResolver = (resolver: ComponentEntrySchemaResolver) => {
  componentEntrySchemaResolver = resolver;
};

const registerContentTypeDocumentSchemaResolver = (resolver: ContentTypeDocumentSchemaResolver) => {
  contentTypeDocumentSchemaResolver = resolver;
};

const resolveComponentEntrySchema = (strapi: Core.Strapi, uid: UID.Component) => {
  if (componentEntrySchemaResolver === undefined) {
    throw new Error('Component entry schema resolver is not registered');
  }

  return componentEntrySchemaResolver(strapi, uid);
};

const resolveContentTypeDocumentSchema = (strapi: Core.Strapi, uid: UID.ContentType) => {
  if (contentTypeDocumentSchemaResolver === undefined) {
    throw new Error('Content-type document schema resolver is not registered');
  }

  return contentTypeDocumentSchemaResolver(strapi, uid);
};

export {
  registerComponentEntrySchemaResolver,
  registerContentTypeDocumentSchemaResolver,
  resolveComponentEntrySchema,
  resolveContentTypeDocumentSchema,
};

export type { ComponentEntrySchemaResolver, ContentTypeDocumentSchemaResolver };
