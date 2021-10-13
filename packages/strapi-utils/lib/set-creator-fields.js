'use strict';

const { assign, assoc } = require('lodash/fp');
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = require('./content-types').constants;

module.exports = ({ user, isEdition = false }) => data => {
  if (isEdition) {
    return assoc(UPDATED_BY_ATTRIBUTE, user.id, data);
  }

  return assign(data, {
    [CREATED_BY_ATTRIBUTE]: user.id,
    [UPDATED_BY_ATTRIBUTE]: user.id,
  });
};
