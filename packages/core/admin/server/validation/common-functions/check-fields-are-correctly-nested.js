'use strict';

const _ = require('lodash');

const checkFieldsAreCorrectlyNested = fields => {
  if (_.isNil(fields)) {
    // Only check if the fields exist
    return true;
  } else if (!Array.isArray(fields)) {
    return false;
  }

  let failed = false;
  for (let indexA = 0; indexA < fields.length; indexA++) {
    failed = fields
      .slice(indexA + 1)
      .some(
        fieldB => fieldB.startsWith(`${fields[indexA]}.`) || fields[indexA].startsWith(`${fieldB}.`)
      );
    if (failed) break;
  }

  return !failed;
};

module.exports = checkFieldsAreCorrectlyNested;
