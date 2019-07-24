'use strict';

const yup = require('yup');

/**
 * Creates the validation schema for content-type configurations
 */
module.exports = model =>
  yup
    .object()
    .shape({
      settings: createSettingsSchema(model),
      metadatas: createMetadasSchema(model),
      layouts: createLayoutsSchema(model),
    })
    .noUnknown();

// TODO: do sth to clean the keys configurable, private etc

const createSettingsSchema = model => {
  const validAttributes = Object.keys(model.allAttributes).filter(key => {
    return (
      model.allAttributes[key].type &&
      !['json', 'password', 'group'].includes(model.allAttributes[key].type)
    );
  });
  const attrs = ['id'].concat(validAttributes);

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
        .oneOf(attrs)
        .default('id'),
      // should be reset when the type changes
      defaultSortBy: yup
        .string()
        .oneOf(attrs)
        .default('id'),
      defaultSortOrder: yup
        .string()
        .oneOf(['ASC', 'DESC'])
        .default('ASC'),
    })
    .noUnknown();
};

const createMetadasSchema = model => {
  return yup.object().shape(
    ['id'].concat(Object.keys(model.allAttributes)).reduce((acc, key) => {
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

const createLayoutsSchema = model => {
  const validAttributes = Object.keys(model.allAttributes).filter(key => {
    return (
      model.allAttributes[key].type &&
      !['json', 'password', 'group'].includes(model.allAttributes[key].type)
    );
  });

  const attrs = ['id'].concat(validAttributes);
  const relationAttributes = Array.isArray(model.associations)
    ? model.associations.map(assoc => assoc.alias)
    : [];

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
                .oneOf(
                  Object.keys(model.allAttributes).filter(
                    key => model.allAttributes[key].type
                  )
                )
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
      .of(yup.string().oneOf(attrs))
      .test(ARRAY_TEST),
    editRelations: yup
      .array()
      .of(yup.string().oneOf(relationAttributes))
      .test(ARRAY_TEST),
  });
};
