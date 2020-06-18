const checkFieldsAreCorrectlNested = fields => {
  if (!Array.isArray(fields)) {
    return true;
  }

  let failed = false;
  for (let indexA = 0; indexA < fields.length; indexA++) {
    failed = fields
      .slice(indexA + 1)
      .some(fieldB => fieldB.startsWith(fields[indexA]) || fields[indexA].startsWith(fieldB));
    if (failed) break;
  }

  return !failed;
};

module.exports = checkFieldsAreCorrectlNested;
