'use strict';

const bcrypt = require('bcrypt');
const { AttributeProcessor } = require('./processor');

const transformActions = ['create', 'update'];

class PasswordProcessor extends AttributeProcessor {
  transform(value, context) {
    const { action } = context;

    if (!transformActions.includes(action)) {
      return value;
    }

    return bcrypt.hashSync(value, 10);
  }
}

module.exports = { PasswordProcessor };
