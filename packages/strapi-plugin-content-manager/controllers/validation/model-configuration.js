'use strict';

const yup = require('yup');
const {
  isListable,
  hasRelationAttribute,
  hasEditableAttribute,
} = require('../../services/utils/configuration/attributes');
/**
 * Creates the validation schema for content-type configurations
 */
module.exports = (model, schema) =>
  yup
    .object()
    .shape({
      settings: createSettingsSchema(model, schema),
      metadatas: createMetadasSchema(model, schema),
      layouts: createLayoutsSchema(model, schema),
    })
    .noUnknown();

const createSettingsSchema = (model, schema) => {
  const validAttributes = Object.keys(schema.attributes).filter(key =>
    isListable(schema, key)
  );

  return yup
    .object()
    .shape({
      bulkable: yup.boolean().required(),
      filterable: yup.boolean().required(),
      pageSize: yup
        .number()
        .integer()
        .min(10)
        .max(100)
        .required(),
      searchable: yup.boolean().required(),
      // should be reset when the type changes
      mainField: yup
        .string()
        .oneOf(validAttributes)
        .default('id'),
      // should be reset when the type changes
      defaultSortBy: yup
        .string()
        .oneOf(validAttributes)
        .default('id'),
      defaultSortOrder: yup
        .string()
        .oneOf(['ASC', 'DESC'])
        .default('ASC'),
    })
    .noUnknown();
};

const createMetadasSchema = (model, schema) => {
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
              mainField: yup.string(),
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

const ARRAY_TEST = {
  name: 'isArray',
  message: '${path} is required and must be an array',
  test: val => Array.isArray(val),
};

const createLayoutsSchema = (model, schema) => {
  const validAttributes = Object.keys(schema.attributes).filter(key =>
    isListable(schema, key)
  );

  const editAttributes = Object.keys(schema.attributes).filter(key =>
    hasEditableAttribute(schema, key)
  );

  const relationAttributes = Object.keys(schema.attributes).filter(key =>
    hasRelationAttribute(schema, key)
  );

  return yup.object().shape({
    edit: yup
      .array()
      .of(
        yup.array().of(
          yup
            .object()
            .shape({
              name: yup
                .string()
                .oneOf(editAttributes)
                .required(),
              size: yup
                .number()
                .integer()
                .positive()
                .required(),
            })
            .noUnknown()
        )
      )
      .test(ARRAY_TEST),
    list: yup
      .array()
      .of(yup.string().oneOf(validAttributes))
      .test(ARRAY_TEST),
    editRelations: yup
      .array()
      .of(yup.string().oneOf(relationAttributes))
      .test(ARRAY_TEST),
  });
};
