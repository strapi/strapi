import _ from 'lodash';

const checkFieldsAreCorrectlyNested = (fields: unknown) => {
  if (_.isNil(fields)) {
    // Only check if the fields exist
    return true;
  }
  if (!Array.isArray(fields)) {
    return false;
  }

  let failed = false;
  for (let indexA = 0; indexA < fields.length; indexA += 1) {
    failed = fields
      .slice(indexA + 1)
      .some(
        (fieldB) =>
          fieldB.startsWith(`${fields[indexA]}.`) || fields[indexA].startsWith(`${fieldB}.`)
      );
    if (failed) break;
  }

  return !failed;
};

export default checkFieldsAreCorrectlyNested;
