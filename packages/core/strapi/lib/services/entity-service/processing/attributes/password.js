'use strict';

const bcrypt = require('bcrypt');
const { AttributeProcessor } = require('./processor');

/** Explanation for the isHashed RegExp
 * Starts with $2b$                                       => /\$2b\$
 * Then is followed by 2 digits and a $ sign.             => \d{2}\$
 * Ends with 53 alphanumerics characters (plus . and /)   => [./a-z-A-Z0-9]{53}/
 */
const bcryptHashRegExp = /\$2b\$\d{2}\$[./a-z-A-Z0-9]{53}/;

const transformActions = ['create', 'update'];

const isHashed = value => bcryptHashRegExp.test(value);

class PasswordProcessor extends AttributeProcessor {
  transform(value, context) {
    // Don't update the value if it has already been hashed
    if (isHashed(value)) {
      return value;
    }

    const { action } = context;

    if (!transformActions.includes(action)) {
      return value;
    }

    return bcrypt.hashSync(value, 10);
  }
}

module.exports = { PasswordProcessor };
