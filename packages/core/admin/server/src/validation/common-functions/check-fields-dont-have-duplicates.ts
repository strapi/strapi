import _ from 'lodash';

const checkFieldsDontHaveDuplicates = (fields: unknown) => {
  if (_.isNil(fields)) {
    // Only check if the fields exist
    return true;
  }
  if (!Array.isArray(fields)) {
    return false;
  }

  return _.uniq(fields).length === fields.length;
};

export default checkFieldsDontHaveDuplicates;
