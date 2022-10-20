'use strict';

const { yup } = require('@strapi/utils');
const { uniq } = require('lodash');

const componentSchemaValidator = yup.object().shape({
  info: yup
    .object()
    .shape({
      displayName: yup.string().required(),
    })
    .required(),
  attributes: yup.object().test({
    name: 'uniqueAttributeNames',
    message: 'Attribute names must be unique',
    test(attributes) {
      const attributeNames = Object.keys(attributes);
      const duplicates = uniq(
        attributeNames
          .map((name) => name.toLocaleLowerCase())
          .filter((name, index, names) => names.indexOf(name) !== index)
      );
      if (duplicates.length) {
        const message = `Attribute names must be unique. The following attributes are duplicated: ${duplicates.join(
          ', '
        )}`;
        return this.createError({ message });
      }
      return true;
    },
  }),
});

const validateComponentDefinition = (data) => {
  return componentSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateComponentDefinition,
};
