import _ from 'lodash';
import { yup, validateYupSchema, errors } from '@strapi/utils';
import createModelConfigurationSchema from './model-configuration';

const { PaginationError, ValidationError } = errors;
const TYPES = ['singleType', 'collectionType'];

/**
 * Validates type kind
 */
const kindSchema = yup.string().oneOf(TYPES).nullable();

const bulkActionInputSchema = yup
  .object({
    documentIds: yup.array().of(yup.strapiID()).min(1).required(),
  })
  .required();

const generateUIDInputSchema = yup.object({
  contentTypeUID: yup.string().required(),
  field: yup.string().required(),
  data: yup.object().required(),
});

const checkUIDAvailabilityInputSchema = yup.object({
  contentTypeUID: yup.string().required(),
  field: yup.string().required(),
  value: yup
    .string()
    .matches(/^[A-Za-z0-9-_.~]*$/)
    .required(),
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

const validateKind = validateYupSchema(kindSchema);
const validateBulkActionInput = validateYupSchema(bulkActionInputSchema);
const validateGenerateUIDInput = validateYupSchema(generateUIDInputSchema);
const validateCheckUIDAvailabilityInput = validateYupSchema(checkUIDAvailabilityInputSchema);

export {
  createModelConfigurationSchema,
  validateUIDField,
  validatePagination,
  validateKind,
  validateBulkActionInput,
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
};
