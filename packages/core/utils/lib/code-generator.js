'use strict';

// Using timestamp (milliseconds) to be sure it is unique
// + converting timestamp to base 36 for better readibility
const generateTimestampCode = (date) => {
  const referDate = date || new Date();

  return referDate.getTime().toString(36);
};

module.exports = {
  generateTimestampCode,
};
