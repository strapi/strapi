'use strict';

const fields = require('../fields');

const createMetadata = models => {
  /*
    primarykey => id only so not needed

    timestamps => not optional anymore

    options => options are handled on the layer above

    filters => not in v1

    private fields ? => handled on a different layer

    attributes

      - type
      - mapping field name - column name
      - mapping field type - column type
      - formatter / parser => coming from field type so no
      - indexes / checks / contstraints
      - relations => reference to the target model (function or string to avoid circular deps ?)
        - name of the LEFT/RIGHT side foreign keys
        - name of join table
        -
      - compo/dz => reference to the components
      - validators
      - hooks
      - default value
      - required -> should add a not null option instead of the API required
      - unique -> should add a DB unique option instead of the unique in the API (Unique by locale or something else for example)

    lifecycles

    */

  const metadata = {};

  models.forEach(model => {
    const modelMetadata = {
      tableName: '',
      attributes: {
        id: {
          type: 'integer',
        },
        createdAt: {
          columnName: 'created_at',
          default: () => new Date(),
        },
        updatedAt: {
          columnName: 'created_at',
        },
        ...Object.keys(model.attributes).reduce((acc, attributeName) => {
          const attribute = model.attributes[attributeName];


          // if relation
          // if compo
          // if dz
          // if scalar

          acc[attributeName] = {
            // find type
            type: attribute.type,
            default: attribute.default,
            field: fields.get(attribute.type)(attribute), // field type with parser / formatter / validator ...
            column: {
              columnType: attribute.columnType,
              columnName: attribute.columnName,
              indexes: {},
              unique: Boolean(attribute.unique),
              nullable: Boolean(attribute.notNull),
            },
          };
        }),
      },
    };

    metadata[model.uid] = modelMetadata;
  });

  return {
    get(uid) {
      return metadata[uid];
    },
  };
};

module.exports = createMetadata;
