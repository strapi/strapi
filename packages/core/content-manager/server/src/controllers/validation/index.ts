import _ from 'lodash';
import { Schema, UID } from '@strapi/types';
import { z, errors } from '@strapi/utils';
import { validateZodAsync, strapiID } from '../../validation/zod';
import createModelConfigurationSchema from './model-configuration';

const { PaginationError, ValidationError } = errors;
const TYPES = ['singleType', 'collectionType'] as const;

/**
 * Validates type kind
 */
const kindSchema = z.enum(TYPES).nullable().optional();

const bulkActionInputSchema = z.object({
  documentIds: z.array(strapiID).min(1),
});

const generateUIDInputSchema = z.object({
  contentTypeUID: z.string(),
  field: z.string(),
  data: z.object({}).passthrough(),
});

const createCheckUIDAvailabilityInputSchema = (regex?: string) =>
  z.object({
    contentTypeUID: z.string(),
    field: z.string(),
    value: z.string().refine(
      (value) => {
        if (value === '') return true;
        const pattern = regex ? new RegExp(regex) : /^[A-Za-z0-9-_.~]*$/;
        return pattern.test(value);
      },
      {
        error: `Must match the custom regex or the default one "/^[A-Za-z0-9-_.~]*$/"`,
      }
    ),
  });

const validateUIDField = (contentTypeUID: any, field: any) => {
  const model = strapi.contentTypes[contentTypeUID];

  if (!model) {
    throw new ValidationError('ContentType not found');
  }

  if (
    !_.has(model, ['attributes', field]) ||
    _.get(model, ['attributes', field, 'type']) !== 'uid'
  ) {
    throw new ValidationError(`${field} must be a valid \`uid\` attribute`);
  }
};

const validatePagination = ({ page, pageSize }: any) => {
  const pageNumber = parseInt(page, 10);
  const pageSizeNumber = parseInt(pageSize, 10);

  if (Number.isNaN(pageNumber) || pageNumber < 1) {
    throw new PaginationError('invalid pageNumber param');
  }
  if (Number.isNaN(pageSizeNumber) || pageSizeNumber < 1) {
    throw new PaginationError('invalid pageSize param');
  }
};

const validateKind = validateZodAsync(kindSchema);
const validateBulkActionInput = validateZodAsync(bulkActionInputSchema);
const validateGenerateUIDInput = validateZodAsync(generateUIDInputSchema);
const validateCheckUIDAvailabilityInput = (body: {
  contentTypeUID: UID.ContentType;
  field: string;
  value: string;
}) => {
  let regex: string | undefined;

  const contentType =
    body.contentTypeUID in strapi.contentTypes ? strapi.contentTypes[body.contentTypeUID] : null;

  if (
    contentType?.attributes[body.field] &&
    `regex` in contentType.attributes[body.field] &&
    (contentType.attributes[body.field] as Schema.Attribute.UID).regex
  ) {
    regex = (contentType?.attributes[body.field] as Schema.Attribute.UID).regex;
  }

  const schema = createCheckUIDAvailabilityInputSchema(regex);
  return validateZodAsync(schema)(body);
};

export {
  createModelConfigurationSchema,
  validateUIDField,
  validatePagination,
  validateKind,
  validateBulkActionInput,
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
};
