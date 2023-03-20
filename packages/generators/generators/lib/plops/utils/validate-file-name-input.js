'use strict';

module.exports = (input) => {
  const regex = /^[A-Za-z-_0-9]+$/g;

  if (!input) {
    return 'You must provide an input';
  }

  return regex.test(input) || "Please use only letters and number, '-' or '_' and no spaces";
};
