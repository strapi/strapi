'use strict';

const { get } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;
const { builder } = require('../../builders/pothosBuilder');

/**
 * Build an Error object type
 * @return {Object<string, NexusObjectTypeDef>}
 */
module.exports = ({ strapi }) => {
  const { ERROR_CODES, ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return builder.objectType(ERROR_TYPE_NAME, {
    fields(t) {
      return {
        code: t.string({
          resolve(parent) {
            const code = get('code', parent);

            const isValidPlaceholderCode = Object.values(ERROR_CODES).includes(code);
            if (!isValidPlaceholderCode) {
              throw new ValidationError(`"${code}" is not a valid code value`);
            }

            return code;
          },
          nullable: false,
        }),
        message: t.string(),
      };
    },
  });
};
