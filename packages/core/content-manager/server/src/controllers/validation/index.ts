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
      function (value, context: TestContext<{ regex?: string; skipRegex?: boolean }>) {
        if (context.options.context?.skipRegex) return true;
        return (
          value === '' ||
          (context.options.context?.regex
            ? new RegExp(context.options?.context.regex).test(value as string)
            : /^[A-Za-z0-9-_.~]*$/.test(value as string))
        );
      }
    ),
  documentId: yup.string().optional(),
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

/** Allow UID attribute or any attribute that has a custom unique index (variant or global). */
const validateUIDFieldOrUniqueIndex = (contentTypeUID: any, field: any) => {
  const model = strapi.contentTypes[contentTypeUID];
  if (!model) throw new ValidationError('ContentType not found');
  if (!_.has(model, ['attributes', field])) {
    throw new ValidationError(`${field} must be a valid attribute`);
  }
  const attrType = _.get(model, ['attributes', field, 'type']);
  if (attrType === 'uid') return;
  const indexes = (model as any).indexes ?? [];
  const inUniqueIndex = indexes.some(
    (idx: any) =>
      idx?.type === 'unique' && Array.isArray(idx?.attributes) && idx.attributes.includes(field)
  );
  if (!inUniqueIndex) {
    throw new ValidationError(
      `${field} must be a \`uid\` attribute or an attribute with a unique index`
    );
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
  documentId?: string;
}) => {
  const options: ValidateOptions<{ regex?: string; skipRegex?: boolean }> = {};

  const contentType =
    body.contentTypeUID in strapi.contentTypes ? strapi.contentTypes[body.contentTypeUID] : null;
  const isUID =
    contentType?.attributes?.[body.field] &&
    _.get(contentType, ['attributes', body.field, 'type']) === 'uid';

  if (isUID) {
    if (
      `regex` in contentType!.attributes[body.field] &&
      (contentType!.attributes[body.field] as Schema.Attribute.UID).regex
    ) {
      options.context = {
        regex: (contentType!.attributes[body.field] as Schema.Attribute.UID).regex,
      };
    }
  } else {
    options.context = { skipRegex: true };
  }

  const validator = validateYupSchema(checkUIDAvailabilityInputSchema, options);

  return validator(body);
};

export {
  createModelConfigurationSchema,
  validateUIDField,
  validateUIDFieldOrUniqueIndex,
  validatePagination,
  validateKind,
  validateBulkActionInput,
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
};
