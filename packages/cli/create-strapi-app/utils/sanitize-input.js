'use strict';

const quote = require('shell-quote').quote;

module.exports = input => {
  // Avoid escape white space caused by @
  if (input.startsWith('@')) {
    // Split the @<scoped> off the package name it's safe
    const [scopedStrapiStarter, ...rest] = input.split('/');
    // Sanitize the rest
    const sanitizedInput = quote(rest);
    // Put the command back together
    return `${scopedStrapiStarter}/${sanitizedInput}`;
  }

  return quote([input]);
};
