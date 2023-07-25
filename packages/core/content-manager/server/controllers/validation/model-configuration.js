'use strict';

const { yup, contentTypes, traverse } = require('@strapi/utils');
const { intersection, isEqual } = require('lodash/fp');
const qs = require('qs');
const { getService } = require('../../utils');
const {
  isListable,
  hasEditableAttribute,
} = require('../../services/utils/configuration/attributes');

const { getNonVisibleAttributes, getWritableAttributes, constants } = contentTypes;
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = constants;

/**
 * Creates the validation schema for content-type configurations
 */
module.exports = (schema, opts = {}) =>
  yup
    .object()
    .shape({
      settings: createSettingsSchema(schema).default(null).nullable(),
      metadatas: createMetadasSchema(schema).default(null).nullable(),
      layouts: createLayoutsSchema(schema, opts).default(null).nullable(),
      options: yup.object().optional(),
    })
    .noUnknown();

const getSortableAttributes = (schema) => {
  const validAttributes = Object.keys(schema.attributes).filter((key) => isListable(schema, key));

  // TODO V5: Refactor non visible fields to be a part of content-manager schema
  const model = strapi.getModel(schema.uid);
  const nonVisibleWritableAttributes = intersection(
    getNonVisibleAttributes(model),
    getWritableAttributes(model)
  );

  return [
    'id',
    ...validAttributes,
    ...nonVisibleWritableAttributes,
    CREATED_BY_ATTRIBUTE,
    UPDATED_BY_ATTRIBUTE,
  ];
};

const createSettingsSchema = (schema) => {
  const validAttributes = Object.keys(schema.attributes).filter((key) => isListable(schema, key));

  return yup
    .object()
    .shape({
      bulkable: yup.boolean().required(),
      filterable: yup.boolean().required(),
      pageSize: yup.number().integer().min(10).max(100).required(),
      searchable: yup.boolean().required(),
      // should be reset when the type changes
      mainField: yup.string().oneOf(validAttributes.concat('id')).default('id'),
      // should be reset when the type changes
      defaultSortBy: yup
        .string()
        .test('is-valid-sort-attribute', '${path} is not a valid sort attribute', async (value) => {
          const omitNonSortableAttributes = ({ schema, key }, { remove }) => {
            const sortableAttributes = getSortableAttributes(schema);
            if (!sortableAttributes.includes(key)) {
              remove(key);
            }
          };

          const parsedValue = qs.parse(value);
          const sanitizedValue = await traverse.traverseQuerySort(
            omitNonSortableAttributes,
            { schema },
            parsedValue
          );
          // If any of the keys has been removed, the sort attribute is not valid
          return isEqual(parsedValue, sanitizedValue);
        })
        .default('id'),
      defaultSortOrder: yup.string().oneOf(['ASC', 'DESC']).default('ASC'),
    })
    .noUnknown();
};

const createMetadasSchema = (schema) => {
  return yup.object().shape(
    Object.keys(schema.attributes).reduce((acc, key) => {
      acc[key] = yup
        .object()
        .shape({
          edit: yup
            .object()
            .shape({
              label: yup.string(),
              description: yup.string(),
              placeholder: yup.string(),
              editable: yup.boolean(),
              visible: yup.boolean(),
              mainField: yup.lazy((value) => {
                if (!value) {
                  return yup.string();
                }

                const targetSchema = getService('content-types').findContentType(
                  schema.attributes[key].targetModel
                );

                if (!targetSchema) {
                  return yup.string();
                }

                const validAttributes = Object.keys(targetSchema.attributes).filter((key) =>
                  isListable(targetSchema, key)
                );

                return yup.string().oneOf(validAttributes.concat('id')).default('id');
              }),
            })
            .noUnknown()
            .required(),
          list: yup
            .object()
            .shape({
              label: yup.string(),
              searchable: yup.boolean(),
              sortable: yup.boolean(),
            })
            .noUnknown()
            .required(),
        })
        .noUnknown();

      return acc;
    }, {})
  );
};

const createArrayTest = ({ allowUndefined = false } = {}) => ({
  name: 'isArray',
  message: '${path} is required and must be an array',
  test: (val) => (allowUndefined === true && val === undefined ? true : Array.isArray(val)),
});

const createLayoutsSchema = (schema, opts = {}) => {
  const validAttributes = Object.keys(schema.attributes).filter((key) => isListable(schema, key));

  const editAttributes = Object.keys(schema.attributes).filter((key) =>
    hasEditableAttribute(schema, key)
  );

  return yup.object().shape({
    edit: yup
      .array()
      .of(
        yup.array().of(
          yup
            .object()
            .shape({
              name: yup.string().oneOf(editAttributes).required(),
              size: yup.number().integer().positive().required(),
            })
            .noUnknown()
        )
      )
      .test(createArrayTest(opts)),
    list: yup.array().of(yup.string().oneOf(validAttributes)).test(createArrayTest(opts)),
  });
};
