'use strict';

const { objectType } = require('nexus');
const { get } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;

/**
 * Build an Error object type
 * @return {Object<string, NexusObjectTypeDef>}
 */
module.exports = ({ strapi }) => {
  const { ERROR_CODES, ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return objectType({
    name: ERROR_TYPE_NAME,

    definition(t) {
      t.nonNull.string('code', {
        resolve(parent) {
          const code = get('code', parent);

          const isValidPlaceholderCode = Object.values(ERROR_CODES).includes(code);
          if (!isValidPlaceholderCode) {
            throw new ValidationError(`"${code}" is not a valid code value`);
          }

          return code;
        },
      });

      t.string('message');
    },
  });
};
