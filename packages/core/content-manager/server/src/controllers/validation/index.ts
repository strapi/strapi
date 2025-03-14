import _ from 'lodash';
import { Schema, UID } from '@strapi/types';
import { yup, validateYupSchema, errors } from '@strapi/utils';
import { ValidateOptions } from 'yup/lib/types';
import { TestContext } from 'yup';
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
    .required()
    .test(
      'isValueMatchingRegex',
      `\${path} must match the custom regex or the default one "/^[A-Za-z0-9-_.~]*$/"`,
      function (value, context: TestContext<{ regex?: string }>) {
        return (
          value === '' ||
          (context.options.context?.regex
            ? new RegExp(context.options?.context.regex).test(value as string)
            : /^[A-Za-z0-9-_.~]*$/.test(value as string))
        );
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

const validateKind = validateYupSchema(kindSchema);
const validateBulkActionInput = validateYupSchema(bulkActionInputSchema);
const validateGenerateUIDInput = validateYupSchema(generateUIDInputSchema);
const validateCheckUIDAvailabilityInput = (body: {
  contentTypeUID: UID.ContentType;
  field: string;
  value: string;
}) => {
  const options: ValidateOptions<{ regex?: string }> = {};

  const contentType =
    body.contentTypeUID in strapi.contentTypes ? strapi.contentTypes[body.contentTypeUID] : null;

  if (
    contentType?.attributes[body.field] &&
    `regex` in contentType.attributes[body.field] &&
    (contentType.attributes[body.field] as Schema.Attribute.UID).regex
  ) {
    options.context = {
      regex: (contentType?.attributes[body.field] as Schema.Attribute.UID).regex,
    };
  }

  const validator = validateYupSchema(checkUIDAvailabilityInputSchema, options);

  return validator(body);
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
