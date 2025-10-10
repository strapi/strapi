import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

import { createContentApiRoutesFactory } from '@strapi/utils';

const ctUIDRegexp = /^((strapi|admin)::[\w-]+|(api|plugin)::[\w-]+\.[\w-]+)$/;
const componentUIDRegexp = /^[\w-]+\.[\w-]+$/;

const baseAttributeSchema = z.object({
  type: z.string(),
  configurable: z.literal(false).optional(),
  private: z.boolean().optional(),
  pluginOptions: z.record(z.string(), z.unknown()).optional(),
});

const mediaAttributeSchema = baseAttributeSchema.extend({
  type: z.literal('media'),
  multiple: z.boolean(),
  required: z.boolean().optional(),
  allowedTypes: z.array(z.string()).optional(),
});

const relationAttributeSchema = baseAttributeSchema.extend({
  type: z.literal('relation'),
  relation: z.string(),
  target: z.string().regex(ctUIDRegexp),
  targetAttribute: z.string().nullable(),
  autoPopulate: z.boolean().optional(),
  mappedBy: z.string().optional(),
  inversedBy: z.string().optional(),
});

const componentAttributeSchema = baseAttributeSchema.extend({
  type: z.literal('component'),
  component: z.string(),
  repeatable: z.boolean(),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const dynamicZoneAttributeSchema = baseAttributeSchema.extend({
  type: z.literal('dynamiczone'),
  components: z.array(z.string().regex(componentUIDRegexp)),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const uidAttributeSchema = baseAttributeSchema.extend({
  type: z.literal('uid'),
  targetField: z.string().optional(),
});

const genericAttributeSchema = z.object({
  type: z.string(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  default: z.unknown().optional(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  enum: z.array(z.string()).optional(),
  regex: z.string().optional(),
  private: z.boolean().optional(),
  configurable: z.boolean().optional(),
  pluginOptions: z.record(z.string(), z.unknown()).optional(),
});

const attributeSchema = z.union([
  mediaAttributeSchema,
  relationAttributeSchema,
  componentAttributeSchema,
  dynamicZoneAttributeSchema,
  uidAttributeSchema,
  genericAttributeSchema,
]);

const contentTypeSchemaBase = z.object({
  displayName: z.string(),
  singularName: z.string(),
  pluralName: z.string(),
  description: z.string(),
  draftAndPublish: z.boolean(),
  kind: z.enum(['collectionType', 'singleType']),
  collectionName: z.string().optional(),
  attributes: z.record(z.string(), attributeSchema),
  visible: z.boolean(),
  restrictRelationsTo: z.array(z.string()).nullable(),
  pluginOptions: z.record(z.string(), z.unknown()).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  reviewWorkflows: z.boolean().optional(),
  populateCreatorFields: z.boolean().optional(),
  comment: z.string().optional(),
  version: z.string().optional(),
});

const formattedContentTypeSchema = z.object({
  uid: z.string().regex(ctUIDRegexp),
  plugin: z.string().optional(),
  apiID: z.string(),
  schema: contentTypeSchemaBase,
});

const componentSchemaBase = z.object({
  displayName: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  connection: z.string().optional(),
  collectionName: z.string().optional(),
  attributes: z.record(z.string(), attributeSchema),
  pluginOptions: z.record(z.string(), z.unknown()).optional(),
});

const formattedComponentSchema = z.object({
  uid: z.string().regex(componentUIDRegexp),
  category: z.string(),
  apiId: z.string(),
  schema: componentSchemaBase,
});

const createRoutes = createContentApiRoutesFactory((): Core.RouterInput['routes'] => {
  return [
    {
      method: 'GET',
      path: '/content-types',
      handler: 'content-types.getContentTypes',
      request: {
        query: { kind: z.enum(['collectionType', 'singleType']) },
      },
      response: z.object({ data: z.array(formattedContentTypeSchema) }),
    },
    {
      method: 'GET',
      path: '/content-types/:uid',
      handler: 'content-types.getContentType',
      request: {
        params: {
          uid: z.string().regex(ctUIDRegexp),
        },
      },
      response: z.object({ data: formattedContentTypeSchema }),
    },
    {
      method: 'GET',
      path: '/components',
      handler: 'components.getComponents',
      response: z.object({ data: z.array(formattedComponentSchema) }),
    },
    {
      method: 'GET',
      path: '/components/:uid',
      handler: 'components.getComponent',
      request: {
        params: {
          uid: z.string().regex(componentUIDRegexp),
        },
      },
      response: z.object({ data: formattedComponentSchema }),
    },
  ];
});

export default createRoutes;
