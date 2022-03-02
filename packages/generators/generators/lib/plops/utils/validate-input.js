'use strict';

module.exports = (input, allowSnakeCase = false) => {
  const regex = allowSnakeCase ? /^[A-Za-z-|_]+$/g : /^[A-Za-z-]+$/g;

  if (!input) {
    return "You must provide an input";
  }

  return regex.test(input) || "Please use only letters, '-' and no spaces";
};
