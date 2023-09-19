'use strict';

const { yup } = require('@strapi/utils');
const { getService } = require('../../utils');
const {
  isListable,
  hasEditableAttribute,
} = require('../../services/utils/configuration/attributes');
const { isValidDefaultSort } = require('../../services/utils/configuration/settings');
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
        .test('is-valid-sort-attribute', '${path} is not a valid sort attribute', async (value) =>
          isValidDefaultSort(schema, value)
        )
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
