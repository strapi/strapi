'use strict';

const yup = require('yup');

/**
 * Creates the validation schema for content-type configurations
 */
module.exports = contentType =>
  yup
    .object()
    .shape({
      settings: createContentTypeSettingsSchema(contentType),
      metadatas: createContentTypeMetadasSchema(contentType),
      layouts: createContentTypeLayoutsSchema(contentType),
    })
    .noUnknown();

// TODO: do sth to clean the keys configurable, private etc

const createContentTypeSettingsSchema = contentType => {
  const validAttributes = Object.keys(contentType.allAttributes).filter(key => {
    return (
      contentType.allAttributes[key].type &&
      !['json', 'password', 'group'].includes(
        contentType.allAttributes[key].type
      )
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

const createContentTypeMetadasSchema = contentType => {
  return yup.object().shape(
    ['id'].concat(Object.keys(contentType.allAttributes)).reduce((acc, key) => {
      acc[key] = yup
        .object()
        .shape({
          edit: yup
            .object()
            .shape({
              label: yup.string().required(),
              description: yup.string(),
              editable: yup.boolean().required(),
              visible: yup.boolean().required(),
              mainField: yup.string(), // only for relations. TODO: to reset when the relation changes
            })
            .noUnknown()
            .required(),
          list: yup
            .object()
            .shape({
              label: yup.string().required(),
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

const createContentTypeLayoutsSchema = contentType => {
  const validAttributes = Object.keys(contentType.allAttributes).filter(key => {
    return (
      contentType.allAttributes[key].type &&
      !['json', 'password', 'group'].includes(
        contentType.allAttributes[key].type
      )
    );
  });

  const attrs = ['id'].concat(validAttributes);
  const relationAttributes = Array.isArray(contentType.associations)
    ? contentType.associations.map(assoc => assoc.alias)
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
                .oneOf(Object.keys(contentType.attributes))
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
